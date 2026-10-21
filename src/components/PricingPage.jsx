import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Copy, Sparkles, X } from 'lucide-react'
import { createPaymentOrder, getPaymentOrder } from '../lib/paymentApi'
import { paymentPlans } from '../lib/paymentPlans'
import './pricing.css'

const packages = [
  {
    name: 'Free', category: 'Gói dùng thử', price: '0đ', period: 'Dùng thử một lần',
    features: [
      ['1 lượt tạo lịch trình bằng AI', true],
      ['Chuyến đi được lưu tự động', true],
      ['Xem trước lịch trình cơ bản', true],
    ],
  },
  {
    planKey: 'single_trip', name: 'Single Trip', category: 'Gói chuyến đi lẻ',
    price: '20.000đ', period: 'Thanh toán một lần',
    features: [
      ['1 lượt tạo lịch trình bằng AI', true],
      ['Dự toán chi phí chi tiết', true],
      ['Giới hạn 1 chuyến lưu theo gói', false],
    ],
  },
  {
    planKey: 'plus', name: 'TripGenie Plus', category: 'Gói mở rộng',
    price: '99.000đ', period: 'Thanh toán một lần',
    features: [
      ['20 lượt tạo lịch trình bằng AI', true],
      ['Giới hạn 10 chuyến lưu theo gói', false],
      ['5 lượt phương án dự phòng thông minh', false],
      ['3 lượt xuất PDF theo gói', false],
    ],
  },
  {
    planKey: 'team', name: 'Team', category: 'Gói cao cấp cho nhóm',
    price: '349.000đ', period: 'Theo sự kiện / dự án nhóm',
    features: [
      ['50 lượt tạo lịch trình bằng AI', true],
      ['Giới hạn 20 chuyến lưu theo gói', false],
      ['Lên kế hoạch nhóm cho 15–50 người', false],
      ['Xuất PDF dành cho nhóm', false],
    ],
  },
]

const money = (amount) => `${Number(amount).toLocaleString('vi-VN')}đ`
const storedOrderKey = (userId) => `tripgenie-payment-order:${userId}`

function Checkout({ order, busy, copied, onCopy, onClose, onRefresh, onRetry }) {
  const plan = paymentPlans[order.planKey]
  const paid = order.status === 'paid'
  const expired = order.status === 'expired'

  return <div className="pricing-checkout-backdrop" onMouseDown={onClose}>
    <section className="pricing-checkout" role="dialog" aria-modal="true" aria-labelledby="pricing-checkout-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="pricing-checkout-close" type="button" onClick={onClose} aria-label="Đóng thanh toán"><X size={20} /></button>
      <span className="section-kicker"><Sparkles size={15} /> TRIPGENIE / THANH TOÁN</span>
      <h2 id="pricing-checkout-title">{paid ? 'Thanh toán thành công' : `Gói ${plan?.name || order.planKey}`}</h2>
      {paid ? <div className="pricing-checkout-success"><Check size={34} /><p>Đã cộng {order.credits} lượt tạo lịch trình vào tài khoản của bạn.</p></div>
        : expired ? <div className="pricing-checkout-expired"><p>Đơn hàng đã hết hạn. Nếu bạn đã chuyển khoản, vui lòng liên hệ TripGenie kèm mã <strong>{order.code}</strong> để được kiểm tra.</p><button type="button" onClick={() => onRetry(order.planKey)} disabled={busy}>Tạo đơn mới</button></div>
          : <>
            {order.mode === 'test' && <p className="pricing-checkout-test">Môi trường thử nghiệm · Không chuyển tiền thật vào mã QR này.</p>}
            <p className="pricing-checkout-intro">Chuyển đúng số tiền và giữ nguyên nội dung để hệ thống tự nhận diện đơn hàng. Đơn có hiệu lực đến {new Date(order.expiresAt).toLocaleString('vi-VN')}.</p>
            <div className="pricing-checkout-grid">
              <div className="pricing-checkout-qr"><img src={order.qrUrl} alt={`Mã QR thanh toán ${money(order.amountVnd)} cho đơn ${order.code}`} /><small>{order.mode === 'test' ? 'QR dành cho thử nghiệm' : 'Quét bằng ứng dụng ngân hàng'}</small></div>
              <div className="pricing-checkout-details">
                <div><span>Ngân hàng</span><strong>{order.bank}</strong></div>
                {order.receiverName && <div><span>Người nhận</span><strong>{order.receiverName}</strong></div>}
                <div><span>Tài khoản ảo (VA)</span><strong>{order.receiverVa}</strong><button type="button" onClick={() => onCopy('va', order.receiverVa)}><Copy size={14} /> {copied === 'va' ? 'Đã sao chép' : 'Sao chép'}</button></div>
                <div><span>Số tiền</span><strong>{money(order.amountVnd)}</strong></div>
                <div><span>Nội dung chuyển khoản</span><strong>{order.code}</strong><button type="button" onClick={() => onCopy('code', order.code)}><Copy size={14} /> {copied === 'code' ? 'Đã sao chép' : 'Sao chép'}</button></div>
              </div>
            </div>
            <div className="pricing-checkout-footer"><span>Đang chờ SePay xác nhận giao dịch…</span><button type="button" onClick={onRefresh} disabled={busy}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra lại'}</button></div>
          </>}
    </section>
  </div>
}

export default function PricingPage({ goTo, tripQuota, session, onLogin, onPaymentSuccess }) {
  const [order, setOrder] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [copied, setCopied] = useState('')
  const lastPaidOrder = useRef(null)
  const orderId = order?.id
  const orderStatus = order?.status

  useEffect(() => {
    if (!session?.user?.id) return
    const savedId = window.sessionStorage.getItem(storedOrderKey(session.user.id))
    if (!savedId) return
    let active = true
    getPaymentOrder(savedId).then((loaded) => {
      if (!active) return
      setOrder(loaded)
      setCheckoutOpen(true)
    }).catch(() => window.sessionStorage.removeItem(storedOrderKey(session.user.id)))
    return () => { active = false }
  }, [session?.user?.id])

  useEffect(() => {
    if (!orderId || orderStatus !== 'pending' || !session?.user?.id) return
    let active = true
    const poll = async () => {
      try {
        const latest = await getPaymentOrder(orderId)
        if (!active) return
        setOrder(latest)
      } catch {
        // Keep the checkout visible; the next poll can recover from a network error.
      }
    }
    const timer = window.setInterval(poll, 4000)
    return () => { active = false; window.clearInterval(timer) }
  }, [orderId, orderStatus, session?.user?.id])

  useEffect(() => {
    if (orderStatus !== 'paid' || !orderId || !session?.user?.id || lastPaidOrder.current === orderId) return
    lastPaidOrder.current = orderId
    window.sessionStorage.removeItem(storedOrderKey(session.user.id))
    onPaymentSuccess()
  }, [orderId, orderStatus, session?.user?.id, onPaymentSuccess])

  const startCheckout = async (planKey) => {
    if (!session) { onLogin(); return }
    setBusy(true)
    setFeedback('')
    try {
      const created = await createPaymentOrder(planKey)
      setOrder(created)
      setCheckoutOpen(true)
      window.sessionStorage.setItem(storedOrderKey(session.user.id), created.id)
    } catch (error) {
      setFeedback(error.message)
    } finally {
      setBusy(false)
    }
  }

  const refreshOrder = async () => {
    if (!order) return
    setBusy(true)
    try {
      const latest = await getPaymentOrder(order.id)
      setOrder(latest)
    } catch (error) {
      setFeedback(error.message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async (field, value) => {
    try { await navigator.clipboard.writeText(value); setCopied(field) } catch { setFeedback('Không sao chép được. Vui lòng chọn và sao chép thủ công.') }
  }

  return <main className="pricing-page inner-page">
    <div className="page-shell">
      <div className="pricing-heading">
        <span className="section-kicker"><Sparkles size={15} /> TRIPGENIE / BẢNG GIÁ</span>
        <h1>Chọn gói cho hành trình của bạn.</h1>
        <p>Từ chuyến đi đầu tiên đến kế hoạch cho cả nhóm.</p>
      </div>
      {session && tripQuota && <div className="pricing-current"><div><strong>Lượt tạo hiện có</strong><span>Còn {tripQuota.remaining} lượt tạo chuyến đi{tripQuota.bonus > 0 ? ` · ${tripQuota.bonus} lượt bổ sung` : ''}</span></div>{tripQuota.remaining > 0 && <button type="button" onClick={() => goTo('create')}>Tạo chuyến đi <ArrowRight size={17} /></button>}</div>}
      {feedback && <p className="pricing-feedback" role="alert">{feedback}</p>}
      <div className="pricing-grid">
        {packages.map((item) => <article className="pricing-card" key={item.name}>
          <div className="pricing-card-main">
            <span className="pricing-tier">{item.name} <span>· {item.category}</span></span>
            <div className="pricing-price"><strong>{item.price}</strong><span>{item.period}</span></div>
            <ul>{item.features.map(([feature, active]) => <li className={active ? '' : 'pricing-feature-future'} key={feature}>{feature}{!active && <small>Đang phát triển</small>}</li>)}</ul>
          </div>
          {item.planKey
            ? <button type="button" className="pricing-start" disabled={busy} onClick={() => startCheckout(item.planKey)}>{busy ? 'Vui lòng chờ…' : 'Thanh toán qua SePay'} <ArrowRight size={17} /></button>
            : <button type="button" className="pricing-start" onClick={() => goTo('create')}>Bắt đầu miễn phí <ArrowRight size={17} /></button>}
        </article>)}
      </div>
      <p className="pricing-note">Sau khi thanh toán thành công, hệ thống tự cộng số lượt tạo lịch trình ghi trên từng gói. Các tính năng được đánh dấu “Đang phát triển” chưa được kích hoạt.</p>
    </div>
    {checkoutOpen && order && <Checkout order={order} busy={busy} copied={copied} onCopy={copy} onClose={() => setCheckoutOpen(false)} onRefresh={refreshOrder} onRetry={startCheckout} />}
  </main>
}
