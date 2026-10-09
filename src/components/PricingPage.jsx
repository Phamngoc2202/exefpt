import { ArrowRight, Sparkles } from 'lucide-react'
import './pricing.css'

const packages = [
  {
    name: 'Free',
    category: 'Gói dùng thử',
    price: '0đ',
    period: 'Dùng thử một lần',
    features: [
      '1 lượt tạo lịch trình bằng AI',
      '0 lịch trình được lưu',
      'Xem trước lịch trình cơ bản',
      'Không có tính năng nâng cao',
    ],
  },
  {
    name: 'Single Trip',
    category: 'Gói chuyến đi lẻ',
    price: '20.000đ',
    period: 'Thanh toán một lần',
    features: [
      '1 lượt tạo lịch trình bằng AI',
      '1 lịch trình được lưu',
      'Dự toán chi phí chi tiết',
      'Không có phương án dự phòng thông minh',
    ],
  },
  {
    name: 'TripGenie Plus',
    category: 'Gói mở rộng',
    price: '99.000đ',
    period: 'Thanh toán một lần',
    features: [
      '20 lượt tạo lịch trình bằng AI',
      '10 lịch trình được lưu',
      '5 lượt dùng phương án dự phòng thông minh',
      '3 lượt xuất PDF',
    ],
  },
  {
    name: 'Team',
    category: 'Gói cao cấp cho nhóm',
    price: '349.000đ',
    period: 'Theo sự kiện / dự án nhóm',
    features: [
      '50 lượt tạo lịch trình bằng AI',
      '20 lịch trình được lưu',
      'Lên kế hoạch nhóm cho 15–50 người',
      'Lập ngân sách nhóm và xuất PDF',
    ],
  },
]

export default function PricingPage({ goTo, tripQuota, session }) {
  return <main className="pricing-page inner-page">
    <div className="page-shell">
      <div className="pricing-heading">
        <span className="section-kicker"><Sparkles size={15} /> TRIPGENIE / BẢNG GIÁ</span>
        <h1>Chọn gói cho hành trình của bạn.</h1>
        <p>Từ chuyến đi đầu tiên đến kế hoạch cho cả nhóm.</p>
      </div>
      {session && tripQuota && <div className="pricing-current"><div><strong>Lượt Free hiện có</strong><span>Còn {tripQuota.remaining} lượt tạo chuyến đi{tripQuota.bonus > 0 ? ` · ${tripQuota.bonus} lượt do admin cấp thêm` : ''}</span></div>{tripQuota.remaining > 0 && <button type="button" onClick={() => goTo('create')}>Tạo chuyến đi <ArrowRight size={17} /></button>}</div>}
      <div className="pricing-grid">
        {packages.map((item) => <article className="pricing-card" key={item.name}>
          <div className="pricing-card-main">
            <span className="pricing-tier">{item.name} <span>· {item.category}</span></span>
            <div className="pricing-price"><strong>{item.price}</strong><span>{item.period}</span></div>
            <ul>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          </div>
          {item.name === 'Free'
            ? <button type="button" className="pricing-start" onClick={() => goTo('create')}>Bắt đầu miễn phí <ArrowRight size={17} /></button>
            : <span className="pricing-card-status">Sắp ra mắt</span>}
        </article>)}
      </div>
      <p className="pricing-note">Đây là bảng giá dự kiến. Hiện chuyến Free được lưu tự động; giới hạn số chuyến lưu và quyền lợi của các gói trả phí chưa được áp dụng.</p>
    </div>
  </main>
}
