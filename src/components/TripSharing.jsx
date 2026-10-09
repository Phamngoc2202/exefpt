import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, CalendarDays, Check, Copy, Eye, Link2, MapPin, Printer, RefreshCw, Share2, ShieldCheck, Users, WalletCards, X } from 'lucide-react'
import { destinationImages } from '../data/destinationImages'
import { formatTripDate, summarizePlan } from '../lib/tripPlanner'
import tripGenieLogo from '../logo/tripgenie-mark.png'
import './trip-sharing.css'

const money = (value) => `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)}đ`

function TripDocument({ plan, printable = false }) {
  const summary = summarizePlan(plan)
  const categories = Object.entries(summary.categories)
  return <article className={printable ? 'trip-document printable-trip-document' : 'trip-document'}>
    <header className="trip-document-header">
      <div className="trip-document-brand"><img src={tripGenieLogo} alt="" /><span><strong>TripGenie</strong><small>Hành trình được cá nhân hóa</small></span></div>
      <span className="trip-document-readonly"><Eye size={14} /> Bản chỉ xem</span>
    </header>
    <section className="trip-document-title">
      <span>HÀNH TRÌNH CỦA BẠN</span>
      <h1>{plan.form.destination}</h1>
      <p>{plan.form.origin} → {plan.form.destination}</p>
      <div>
        <span><CalendarDays size={15} /> {formatTripDate(plan.form.startDate)} – {formatTripDate(plan.form.endDate)}</span>
        <span><Users size={15} /> {plan.form.travelers} người</span>
        <span><WalletCards size={15} /> Ngân sách {money(plan.form.budget)}</span>
      </div>
    </section>

    {plan.form.specialRequest?.trim() && <section className="trip-document-request"><strong>Yêu cầu riêng</strong><p>{plan.form.specialRequest.trim()}</p></section>}

    <section className="trip-document-budget">
      <div><span>Chi phí dự kiến</span><strong>{money(summary.total)}</strong><small>{summary.overBudget ? `Vượt ngân sách ${money(-summary.remaining)}` : `Còn lại ${money(summary.remaining)}`}</small></div>
      <div className="trip-document-budget-grid">{categories.map(([category, value]) => <span key={category}><small>{category}</small><strong>{money(value)}</strong></span>)}<span><small>Dự phòng</small><strong>{money(summary.reserve)}</strong></span></div>
    </section>

    <div className="trip-document-days">{plan.days.map((day) => <section className="trip-document-day" key={day.date}>
      <header><span>Ngày {day.day}</span><div><h2>{day.destination || day.city || plan.form.destination}</h2><p>{formatTripDate(day.date)} · {day.label}</p></div></header>
      <div>{day.activities.map((activity) => <article key={activity.id}>
        <time>{activity.time}</time>
        <span className="trip-document-dot" />
        <div><strong>{activity.title}</strong><p>{activity.note}</p><small><MapPin size={11} /> {activity.location || day.destination || plan.form.destination}</small></div>
        <b>{money(activity.cost)}</b>
      </article>)}</div>
    </section>)}</div>

    <footer className="trip-document-footer"><ShieldCheck size={15} /><span>Chi phí, giờ mở cửa và thời gian di chuyển chỉ mang tính tham khảo. Hãy kiểm tra lại với nhà cung cấp trước khi đặt dịch vụ.</span></footer>
  </article>
}

export function PrintableTripDocument({ plan }) {
  return <TripDocument plan={plan} printable />
}

export function TripShareDialog({ url, loading, error, onClose, onRetry, onRevoke }) {
  const inputRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  const copyUrl = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      inputRef.current?.select()
      document.execCommand('copy')
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }
  const shareUrl = async () => {
    if (!url) return
    if (navigator.share) {
      try { await navigator.share({ title: 'Lịch trình TripGenie', text: 'Xem lịch trình du lịch của tôi trên TripGenie.', url }) } catch { /* Người dùng đóng bảng chia sẻ. */ }
      return
    }
    await copyUrl()
  }
  const revoke = async () => {
    if (!window.confirm('Tắt liên kết này? Người đã nhận link sẽ không xem được lịch trình nữa.')) return
    setRevoking(true)
    const revoked = await onRevoke()
    setRevoking(false)
    if (revoked) onClose()
  }

  return createPortal(<div className="share-dialog-backdrop" onMouseDown={onClose}><section className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className="share-dialog-close" type="button" onClick={onClose} aria-label="Đóng"><X size={19} /></button>
    <span className="share-dialog-icon"><Share2 size={22} /></span>
    <h2 id="share-dialog-title">Chia sẻ chuyến đi</h2>
    <p>Người có liên kết chỉ xem được bản chụp lịch trình, không thể sửa hoặc truy cập tài khoản của bạn.</p>
    {loading ? <div className="share-dialog-loading"><RefreshCw className="spin" size={18} /> Đang tạo liên kết an toàn…</div> : error ? <div className="share-dialog-error"><strong>Chưa tạo được liên kết</strong><span>{error}</span><button type="button" onClick={onRetry}>Thử lại</button></div> : <>
      <label className="share-link-field"><Link2 size={17} /><input ref={inputRef} value={url} readOnly aria-label="Liên kết chia sẻ chuyến đi" /><button type="button" onClick={copyUrl}>{copied ? <><Check size={16} /> Đã chép</> : <><Copy size={16} /> Sao chép</>}</button></label>
      <div className="share-dialog-actions"><button type="button" className="share-native" onClick={shareUrl}><Share2 size={17} /> Chia sẻ qua ứng dụng</button><button type="button" className="share-revoke" onClick={revoke} disabled={revoking}>{revoking ? 'Đang tắt…' : 'Tắt liên kết'}</button></div>
    </>}
    <small><ShieldCheck size={13} /> Liên kết không chứa email hoặc mã đăng nhập.</small>
  </section></div>, document.body)
}

export function SharedTripPage({ state, onCreateOwn, onBackHome }) {
  if (state.status === 'loading') return <main className="shared-trip-state inner-page"><RefreshCw className="spin" size={28} /><h1>Đang mở lịch trình…</h1><p>TripGenie đang kiểm tra liên kết chia sẻ.</p></main>
  if (state.status === 'error') return <main className="shared-trip-state inner-page"><Link2 size={30} /><h1>Liên kết không khả dụng</h1><p>{state.error}</p><button type="button" onClick={onBackHome}>Về trang chủ <ArrowRight size={17} /></button></main>

  const plan = state.plan
  const hero = destinationImages[plan.form.destination] || destinationImages['Ninh Bình']
  return <main className="shared-trip-page">
    <section className="shared-trip-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(5,40,48,.94), rgba(5,53,59,.68)), url(${hero})` }}>
      <div className="page-shell"><span><Eye size={15} /> LIÊN KẾT CHỈ XEM</span><h1>Hành trình đến<br /><em>{plan.form.destination}.</em></h1><p>Được chia sẻ từ TripGenie · Không thể chỉnh sửa chuyến đi gốc.</p><div><button type="button" onClick={() => window.print()}><Printer size={17} /> In / Lưu PDF</button><button type="button" onClick={onCreateOwn}>Tạo chuyến của tôi <ArrowRight size={17} /></button></div></div>
    </section>
    <div className="page-shell shared-trip-content"><TripDocument plan={plan} /></div>
  </main>
}
