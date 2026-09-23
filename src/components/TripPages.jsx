import { useState } from 'react'
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, CircleDollarSign, Clock3, Compass,
  Hotel, Landmark, Map, MapPin, Navigation, Pencil, Plus, RefreshCw, Save,
  Ticket, TrainFront, Trash2, Users, Utensils, WalletCards, X,
} from 'lucide-react'
import { destinationNames, findDestination } from '../data/northernDestinations'
import { destinationImages } from '../data/destinationImages'
import { COST_CATEGORIES, MAX_TRIP_DAYS, addDays, countTripDays, formatTripDate, summarizePlan } from '../lib/tripPlanner'

const interestOptions = ['Ẩm thực', 'Thiên nhiên', 'Văn hóa', 'Chụp ảnh', 'Biển', 'Mua sắm']
const budgetRows = [
  { category: 'Di chuyển', color: '#22a879', icon: TrainFront },
  { category: 'Lưu trú', color: '#4338ca', icon: Hotel },
  { category: 'Ăn uống', color: '#f97316', icon: Utensils },
  { category: 'Hoạt động', color: '#d946ef', icon: Ticket },
  { category: 'Dự phòng', color: '#e4ad37', icon: WalletCards },
]
const activityIcons = { food: Utensils, hotel: Hotel, transport: Navigation, place: Landmark }
const formatMoney = (value) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

export function CreateTripPage({ form, setForm, onGenerate, formError, onBack }) {
  const destination = findDestination(form.destination)
  const toggleInterest = (interest) => {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }))
  }
  const chooseGroup = (travelWith) => {
    const suggestedCount = { 'Một mình': 1, 'Cặp đôi': 2, 'Bạn bè': 3, 'Gia đình': 4 }
    setForm({ ...form, travelWith, travelers: suggestedCount[travelWith] })
  }
  const changeStartDate = (startDate) => {
    const dayCount = Math.max(1, countTripDays(form.startDate, form.endDate))
    setForm({ ...form, startDate, endDate: startDate ? addDays(startDate, dayCount - 1) : '' })
  }

  return (
    <main className="create-page page-shell inner-page">
      <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Quay lại</button>
      <div className="create-layout">
        <aside className="create-intro">
          <span className="eyebrow light"><Compass size={15} /> Miền Bắc Việt Nam</span>
          <h1>Hành trình của bạn bắt đầu từ đây.</h1>
          <p>Chọn điểm đến, thời gian và ngân sách. TripGenie ghép lịch trình gợi ý từ dữ liệu mẫu, sau đó bạn có thể chỉnh từng hoạt động và khoản chi.</p>
          <div className="progress-list">
            <div className="done"><span><Check size={15} /></span><div><strong>Thông tin cơ bản</strong><small>Điểm đến & thời gian</small></div></div>
            <div className="current"><span>2</span><div><strong>Sở thích cá nhân</strong><small>Số người & phong cách</small></div></div>
            <div><span>3</span><div><strong>Kiểm tra chi phí</strong><small>Sửa kế hoạch trước khi lưu</small></div></div>
          </div>
          <div className="quote-card"><WalletCards size={19} /><p>“Một chuyến đi dễ quyết định hơn khi mỗi khoản chi đều rõ ràng.”</p></div>
        </aside>

        <section className="form-card">
          <div className="form-title"><span>01</span><div><h2>Thông tin chuyến đi</h2><p>Hiện hỗ trợ 5 điểm đến miền Bắc, khởi hành từ Hà Nội</p></div></div>
          <div className="field-grid">
            <label className="field full"><span>Điểm đến</span><div className="input-wrap"><MapPin size={18} /><select value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })}>{destinationNames.map((city) => <option key={city}>{city}</option>)}</select></div></label>
            <label className="field"><span>Ngày bắt đầu</span><div className="input-wrap"><CalendarDays size={18} /><input type="date" value={form.startDate} onChange={(event) => changeStartDate(event.target.value)} /></div></label>
            <label className="field"><span>Ngày kết thúc</span><div className="input-wrap"><CalendarDays size={18} /><input type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></div></label>
            <label className="field"><span>Ngân sách cả nhóm</span><div className="input-wrap"><CircleDollarSign size={18} /><input type="number" min="1" step="10000" value={form.budget} onChange={(event) => setForm({ ...form, budget: Number(event.target.value) })} /><b>VNĐ</b></div></label>
            <label className="field"><span>Số người đi</span><div className="input-wrap"><Users size={18} /><input type="number" min="1" max="10" value={form.travelers} onChange={(event) => setForm({ ...form, travelers: Number(event.target.value) })} /><b>người</b></div></label>
          </div>
          <p className="form-helper">{destination?.city} cần ít nhất {destination?.minDays} ngày; mỗi kế hoạch hỗ trợ tối đa {MAX_TRIP_DAYS} ngày. Chi phí di chuyển mặc định là ước tính khứ hồi từ Hà Nội.</p>

          <div className="form-divider" />
          <div className="form-title"><span>02</span><div><h2>Bạn thích đi như thế nào?</h2><p>Điều chỉnh gợi ý hoạt động và chi phí cơ bản</p></div></div>
          <div className="choice-section"><label>Đi cùng ai?</label><div className="choice-row">
            {['Một mình', 'Cặp đôi', 'Bạn bè', 'Gia đình'].map((option) => <button className={form.travelWith === option ? 'choice active' : 'choice'} onClick={() => chooseGroup(option)} key={option} type="button">{option}</button>)}
          </div></div>
          <div className="choice-section"><label>Sở thích <small>Chọn nhiều mục</small></label><div className="chip-row">
            {interestOptions.map((interest) => <button className={form.interests.includes(interest) ? 'interest-chip active' : 'interest-chip'} onClick={() => toggleInterest(interest)} key={interest} type="button">{form.interests.includes(interest) && <Check size={14} />}{interest}</button>)}
          </div></div>
          <div className="choice-section"><label>Phong cách du lịch</label><div className="style-options">
            {[
              ['Tiết kiệm', 'Chi phí cơ bản', '₫'],
              ['Cân bằng', 'Thoải mái vừa đủ', '₫₫'],
              ['Cao cấp', 'Lưu trú & ăn uống cao hơn', '₫₫₫'],
            ].map(([title, description, price]) => <button type="button" onClick={() => setForm({ ...form, style: title })} className={form.style === title ? 'style-option active' : 'style-option'} key={title}><span className="radio-dot" /><div><strong>{title}</strong><small>{description}</small></div><b>{price}</b></button>)}
          </div></div>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <button className="generate-button" onClick={onGenerate}><Compass size={19} /> Tạo kế hoạch ước tính <ArrowRight size={18} /></button>
          <p className="form-note"><WalletCards size={13} /> Đây là giá ước tính, chưa phải giá vé hay báo giá đặt chỗ.</p>
        </section>
      </div>
    </main>
  )
}

function BudgetPanel({ plan }) {
  const summary = summarizePlan(plan)
  const values = budgetRows.map((row) => row.category === 'Dự phòng' ? summary.reserve : summary.categories[row.category])
  const chartTotal = Math.max(1, summary.total)
  let position = 0
  const slices = budgetRows.map((row, index) => {
    const start = position
    position += values[index] / chartTotal * 100
    return `${row.color} ${start}% ${position}%`
  })

  return (
    <section className="budget-card">
      <div className="panel-heading"><div><span className="section-kicker">Ngân sách rõ ràng</span><h2>Chi phí dự kiến</h2></div></div>
      <div className="budget-summary">
        <div className="donut" style={{ background: `conic-gradient(${slices.join(', ')})` }}><div><small>Tổng dự kiến</small><strong>{(summary.total / 1000000).toFixed(1)}M</strong><span>VNĐ</span></div></div>
        <div className="budget-legend">
          {budgetRows.map((row, index) => <div key={row.category}><span className="legend-dot" style={{ background: row.color }} /><span>{row.category}</span><strong>{Math.round(values[index] / chartTotal * 100)}%</strong></div>)}
        </div>
      </div>
      <div className="budget-list">
        {budgetRows.map((row, index) => {
          const Icon = row.icon
          return <div className="budget-row" key={row.category}><span className="budget-icon" style={{ color: row.color, background: `${row.color}15` }}><Icon size={17} /></span><span>{row.category}</span><strong>{formatMoney(values[index])}</strong></div>
        })}
      </div>
      <div className="budget-totals"><span>Ngân sách cả nhóm</span><strong>{formatMoney(plan.form.budget)}</strong></div>
      <div className={summary.overBudget ? 'budget-safe over-budget' : 'budget-safe'}>
        {summary.overBudget ? <X size={17} /> : <Check size={17} />}
        <div><strong>{summary.overBudget ? `Vượt ${formatMoney(-summary.remaining)}` : `Còn ${formatMoney(summary.remaining)}`}</strong><small>Đã tính {formatMoney(summary.reserve)} dự phòng (10%).</small></div>
      </div>
      <p className="estimate-note">Giá chỉ để tham khảo. Hãy kiểm tra vé, phòng và phương tiện trước khi đặt.</p>
    </section>
  )
}

function ActivityEditor({ activity, onChange, onDone, onDelete }) {
  return (
    <div className="activity-editor">
      <label>Hoạt động<input value={activity.title} onChange={(event) => onChange({ title: event.target.value })} /></label>
      <div className="activity-editor-row">
        <label>Giờ<input type="time" value={activity.time} onChange={(event) => onChange({ time: event.target.value })} /></label>
        <label>Loại<select value={activity.category} onChange={(event) => onChange({ category: event.target.value })}>{COST_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Chi phí cả nhóm (VNĐ)<input type="number" min="0" step="10000" value={activity.cost} onChange={(event) => onChange({ cost: Number(event.target.value) })} /></label>
      </div>
      <label>Ghi chú<input value={activity.note} onChange={(event) => onChange({ note: event.target.value })} /></label>
      <div className="activity-editor-actions"><button className="secondary-button small" onClick={onDelete}><Trash2 size={15} /> Xóa</button><button className="primary-button compact" onClick={onDone}><Check size={15} /> Xong</button></div>
    </div>
  )
}

export function ItineraryPage({ plan, onSave, saved, saving, onRegenerate, onUpdateActivity, onAddActivity, onDeleteActivity }) {
  const [activeDay, setActiveDay] = useState(1)
  const [editingId, setEditingId] = useState(null)
  const dayData = plan.days.find((day) => day.day === activeDay) || plan.days[0]
  const destination = findDestination(plan.form.destination)
  const dateLabel = `${formatTripDate(plan.form.startDate)} – ${formatTripDate(plan.form.endDate)}`

  return (
    <main className="itinerary-page inner-page">
      <section className="trip-banner" style={{ backgroundImage: 'linear-gradient(90deg, rgba(11,38,30,.94), rgba(12,42,34,.78) 57%, rgba(12,42,34,.4)), url(' + (destinationImages[plan.form.destination] || destinationImages['Ninh Bình']) + ')' }}><div className="page-shell banner-inner">
        <div><span className="eyebrow light"><Compass size={14} /> Kế hoạch gợi ý · miền Bắc</span><h1>{plan.form.destination} — hành trình của bạn</h1><p><CalendarDays size={16} /> {dateLabel} <span /> <Users size={16} /> {plan.form.travelers} người <span /> <WalletCards size={16} /> Ngân sách {formatMoney(plan.form.budget)}</p></div>
        <div className="banner-actions"><button className="secondary-button" onClick={onRegenerate}><RefreshCw size={17} /> Tạo lại</button><button className={saved ? 'primary-button saved' : 'primary-button'} onClick={onSave} disabled={saved || saving}>{saved ? <Check size={17} /> : <Save size={17} />}{saving ? 'Đang lưu...' : saved ? 'Đã lưu' : plan.id ? 'Lưu thay đổi' : 'Lưu chuyến đi'}</button></div>
      </div></section>

      <div className="page-shell itinerary-layout">
        <div className="itinerary-main">
          <div className="day-tabs">{plan.days.map((day) => <button className={dayData.day === day.day ? 'active' : ''} onClick={() => { setActiveDay(day.day); setEditingId(null) }} key={day.date}><span>Ngày {day.day}</span><small>{formatTripDate(day.date, { day: '2-digit', month: 'short' })}</small></button>)}</div>
          <section className="timeline-card">
            <div className="timeline-title"><div><span className="date-box"><strong>{dayData.date.slice(8, 10)}</strong><small>THG {dayData.date.slice(5, 7)}</small></span><div><h2>Ngày {dayData.day} tại {plan.form.destination}</h2><p>{dayData.label} · {dayData.activities.length} hoạt động</p></div></div><button className="secondary-button small" onClick={() => setEditingId(onAddActivity(dayData.day))}><Plus size={16} /> Thêm hoạt động</button></div>
            <div className="timeline">
              {dayData.activities.map((activity) => {
                const Icon = activityIcons[activity.type] || Landmark
                return <div className="timeline-item" key={activity.id}>
                  <div className="time"><strong>{activity.time}</strong><small>Ước tính</small></div>
                  <span className={`activity-icon ${activity.type}`}><Icon size={18} /></span>
                  <div className="activity-copy"><h3>{activity.title}</h3><p>{activity.note}</p><span><MapPin size={13} /> {plan.form.destination}, Việt Nam</span>
                    {editingId === activity.id && <ActivityEditor activity={activity} onChange={(changes) => onUpdateActivity(dayData.day, activity.id, changes)} onDone={() => setEditingId(null)} onDelete={() => { onDeleteActivity(dayData.day, activity.id); setEditingId(null) }} />}
                  </div>
                  <div className="activity-cost"><strong>{activity.cost === 0 ? '0đ' : formatMoney(activity.cost)}</strong><button onClick={() => setEditingId(editingId === activity.id ? null : activity.id)} aria-label={`Chỉnh sửa ${activity.title}`}><Pencil size={15} /></button></div>
                </div>
              })}
            </div>
            <button className="secondary-button add-activity-bottom" onClick={() => setEditingId(onAddActivity(dayData.day))}><Plus size={16} /> Thêm hoạt động</button>
          </section>
        </div>
        <aside className="itinerary-side"><BudgetPanel plan={plan} /><div className="plan-disclaimer"><strong>Cần kiểm tra trước khi đi</strong><p>Thứ tự tham quan, giờ mở cửa, thời gian di chuyển và giá có thể thay đổi. Đây chưa phải lịch trình đặt chỗ.</p>{destination && <a href={destination.guideUrl} target="_blank" rel="noreferrer">Xem thông tin điểm đến ↗</a>}</div></aside>
      </div>
    </main>
  )
}

export function TripsPage({ trips, goTo, onOpen, onDelete, deletingId }) {
  return (
    <main className="trips-page page-shell inner-page">
      <div className="section-heading trips-heading"><div><span className="section-kicker">Bộ sưu tập hành trình</span><h1>Chuyến đi của tôi</h1><p>Mở lại đúng lịch trình và chi phí bạn đã lưu.</p></div><button className="primary-button" onClick={() => goTo('create')}><Plus size={17} /> Tạo chuyến đi mới</button></div>
      <div className="trip-stats"><div><Compass /><span><strong>{trips.length}</strong><small>Chuyến đi</small></span></div><div><CalendarDays /><span><strong>{trips.reduce((sum, trip) => sum + countTripDays(trip.form.startDate, trip.form.endDate), 0)}</strong><small>Ngày khám phá</small></span></div><div><Map /><span><strong>{new Set(trips.map((trip) => trip.form.destination)).size}</strong><small>Điểm đến</small></span></div></div>
      {trips.length === 0 ? <div className="empty-trips"><Compass size={34} /><h2>Chưa có chuyến đi nào</h2><p>Tạo một kế hoạch miền Bắc rồi lưu lại để xem ở đây.</p><button className="primary-button" onClick={() => goTo('create')}>Lên kế hoạch đầu tiên <ArrowRight size={17} /></button></div> : <div className="trips-grid">
        {trips.map((trip) => {
          const destination = findDestination(trip.form.destination)
          const summary = summarizePlan(trip)
          return <article className="saved-trip-card" key={trip.id}>
            <div className="trip-art" style={{ backgroundImage: destinationImages[trip.form.destination] ? 'linear-gradient(180deg, transparent, rgba(6,34,27,.32)), url(' + destinationImages[trip.form.destination] + ')' : destination?.color || 'linear-gradient(135deg,#36755c,#85b183)' }}><button onClick={() => onDelete(trip)} disabled={deletingId === trip.id} aria-label={'Xóa chuyến đi ' + trip.form.destination} title="Xóa chuyến đi"><Trash2 size={16} /></button><small>{summary.overBudget ? 'Vượt ngân sách' : 'Đã lên kế hoạch'}</small></div>
            <div className="trip-card-body"><span className="trip-date"><CalendarDays size={14} /> {formatTripDate(trip.form.startDate)} – {formatTripDate(trip.form.endDate)}</span><h2>{trip.form.destination}</h2><div className="trip-meta"><span><Clock3 size={14} /> {countTripDays(trip.form.startDate, trip.form.endDate)} ngày</span><span><Users size={14} /> {trip.form.travelers} người</span></div><p className="trip-cost-line">Dự kiến {formatMoney(summary.total)} / {formatMoney(trip.form.budget)}</p><button onClick={() => onOpen(trip)}>Xem hành trình <ArrowRight size={16} /></button></div>
          </article>
        })}
        <button className="new-trip-card" onClick={() => goTo('create')}><span><Plus /></span><strong>Lên kế hoạch mới</strong><small>Hành trình tiếp theo đang chờ bạn</small></button>
      </div>}
      <p className="estimate-note">Các mức giá trong kế hoạch là ước tính và có thể chỉnh sửa; TripGenie chưa kết nối giá thời gian thực.</p>
    </main>
  )
}
