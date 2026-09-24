import { ArrowRight, Check, Compass, Crown, Sparkles } from 'lucide-react'
import './pricing.css'

const packages = [
  {
    name: 'Free', price: '0đ', period: 'trọn đời', quota: '1 lần tạo chuyến đi',
    description: 'Thử lập một hành trình và xem trước chi phí.', icon: Compass,
  },
  {
    name: 'Plus', price: '99.000đ', period: '3 tháng', quota: '20 lần tạo chuyến đi',
    description: 'Dành cho những người thích lên kế hoạch thường xuyên.', icon: Sparkles,
  },
  {
    name: 'Pro', price: '499.000đ', period: '12 tháng', quota: 'Không giới hạn lượt tạo',
    description: 'Tự do khám phá mọi ý tưởng trong thời hạn gói.', icon: Crown,
  },
]

export default function PricingPage({ goTo, tripQuota, session }) {
  return <main className="pricing-page inner-page">
    <div className="page-shell">
      <div className="pricing-heading">
        <span className="section-kicker"><Sparkles size={15} /> TRIPGENIE / BẢNG GIÁ</span>
        <h1>Chọn cách bạn muốn khám phá.</h1>
        <p>Một hành trình rõ ràng bắt đầu từ kế hoạch phù hợp. Xem các gói TripGenie dự kiến dành cho bạn.</p>
      </div>
      {session && tripQuota && <div className="pricing-current"><div><strong>Gói Free của bạn</strong><span>Còn {tripQuota.remaining} lượt tạo chuyến đi{tripQuota.bonus > 0 ? ` · ${tripQuota.bonus} lượt do admin cấp thêm` : ''}</span></div>{tripQuota.remaining > 0 && <button type="button" onClick={() => goTo('create')}>Tạo chuyến đi <ArrowRight size={17} /></button>}</div>}
      <div className="pricing-grid">
        {packages.map((item) => {
          const Icon = item.icon
          return <article className={`pricing-card${item.name === 'Plus' ? ' featured' : ''}`} key={item.name}>
            {item.name === 'Plus' && <span className="pricing-featured-label">PHỔ BIẾN</span>}
            <div className="pricing-icon"><Icon size={24} /></div>
            <span className="pricing-tier">{item.name}</span>
            <p>{item.description}</p>
            <div className="pricing-price"><strong>{item.price}</strong><span>/ {item.period}</span></div>
            <div className="pricing-rule" />
            <div className="pricing-benefit"><Check size={19} /><strong>{item.quota}</strong></div>
            <ul>
              <li><Check size={16} /> Lịch trình theo ngày</li>
              <li><Check size={16} /> Dự toán và chỉnh sửa chi phí</li>
              <li><Check size={16} /> Lưu và xem lại chuyến đi</li>
            </ul>
            {item.name === 'Free'
              ? <button type="button" className="pricing-start" onClick={() => goTo('create')}>Bắt đầu miễn phí <ArrowRight size={17} /></button>
              : <span className="pricing-card-status">Sắp ra mắt</span>}
          </article>
        })}
      </div>
      <p className="pricing-note">Lượt Free và lượt admin cấp thêm đã được áp dụng. Plus và Pro hiện chỉ giới thiệu, chưa có thanh toán hoặc kích hoạt gói.</p>
    </div>
  </main>
}
