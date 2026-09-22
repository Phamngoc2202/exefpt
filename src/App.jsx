import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Compass,
  Heart,
  Hotel,
  Landmark,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Palmtree,
  Pencil,
  Plane,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Star,
  Ticket,
  TrainFront,
  UserRound,
  Users,
  Utensils,
  WalletCards,
  X,
} from 'lucide-react'
import './App.css'

const destinationCards = [
  {
    city: 'Đà Nẵng',
    meta: 'Biển · Ẩm thực · Nghỉ dưỡng',
    days: '3–4 ngày',
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85',
  },
  {
    city: 'Hội An',
    meta: 'Văn hóa · Phố cổ · Check-in',
    days: '2–3 ngày',
    image:
      'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1000&q=85',
  },
  {
    city: 'Hà Giang',
    meta: 'Thiên nhiên · Khám phá · Phượt',
    days: '4–5 ngày',
    image:
      'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1000&q=85',
  },
]

const interestOptions = ['Ẩm thực', 'Biển', 'Văn hóa', 'Chụp ảnh', 'Mua sắm', 'Thiên nhiên']

const itinerary = [
  {
    day: 1,
    label: 'Khám phá biểu tượng',
    activities: [
      { time: '08:00', title: 'Mì Quảng Bà Mua', note: 'Bắt đầu ngày mới với đặc sản địa phương', cost: '60.000đ', type: 'food' },
      { time: '09:30', title: 'Bà Nà Hills', note: 'Cầu Vàng, làng Pháp và cáp treo', cost: '900.000đ', type: 'place' },
      { time: '15:30', title: 'Nhận phòng khách sạn', note: 'Nghỉ ngơi tại khu vực biển Mỹ Khê', cost: '500.000đ', type: 'hotel' },
      { time: '17:30', title: 'Hoàng hôn biển Mỹ Khê', note: 'Tắm biển và dạo bộ ven bờ', cost: 'Miễn phí', type: 'nature' },
      { time: '19:30', title: 'Hải sản Năm Đảnh', note: 'Bữa tối hải sản tươi sống', cost: '350.000đ', type: 'food' },
    ],
  },
  {
    day: 2,
    label: 'Một ngày ở Hội An',
    activities: [
      { time: '08:30', title: 'Khởi hành đi Hội An', note: 'Di chuyển dọc cung đường biển', cost: '180.000đ', type: 'transport' },
      { time: '10:00', title: 'Phố cổ Hội An', note: 'Chùa Cầu và những con hẻm vàng', cost: '120.000đ', type: 'place' },
      { time: '12:00', title: 'Cơm gà Bà Buội', note: 'Thưởng thức món ăn trứ danh phố Hội', cost: '100.000đ', type: 'food' },
      { time: '15:00', title: 'Faifo Coffee', note: 'Ngắm mái ngói phố cổ từ sân thượng', cost: '90.000đ', type: 'food' },
      { time: '18:30', title: 'Thả hoa đăng sông Hoài', note: 'Dạo phố đèn lồng về đêm', cost: '80.000đ', type: 'place' },
    ],
  },
  {
    day: 3,
    label: 'Thiên nhiên & thư giãn',
    activities: [
      { time: '07:30', title: 'Bán đảo Sơn Trà', note: 'Cung đường xanh nhìn ra thành phố', cost: '100.000đ', type: 'nature' },
      { time: '09:00', title: 'Chùa Linh Ứng', note: 'Không gian thanh tịnh bên biển', cost: 'Miễn phí', type: 'place' },
      { time: '11:30', title: 'Bún chả cá Hờn', note: 'Bữa trưa nhẹ trước khi mua quà', cost: '55.000đ', type: 'food' },
      { time: '14:00', title: 'Chợ Hàn', note: 'Mua đặc sản và quà lưu niệm', cost: '400.000đ', type: 'place' },
      { time: '16:30', title: 'Kết thúc hành trình', note: 'Di chuyển ra sân bay', cost: '120.000đ', type: 'transport' },
    ],
  },
]

const budgetItems = [
  { label: 'Lưu trú', value: 1500000, percent: 30, color: '#4338ca', icon: Hotel },
  { label: 'Ăn uống', value: 1000000, percent: 20, color: '#f97316', icon: Utensils },
  { label: 'Di chuyển', value: 750000, percent: 15, color: '#22a879', icon: TrainFront },
  { label: 'Hoạt động', value: 1250000, percent: 25, color: '#d946ef', icon: Ticket },
  { label: 'Dự phòng', value: 500000, percent: 10, color: '#f5c451', icon: WalletCards },
]

const starterTrips = [
  { id: 1, city: 'Đà Nẵng', date: '20–23 Thg 10, 2026', days: 3, budget: '5 triệu', color: 'violet', emoji: '🌊' },
  { id: 2, city: 'TP. Hồ Chí Minh', date: '02–05 Thg 11, 2026', days: 4, budget: '6 triệu', color: 'orange', emoji: '🌆' },
]

const activityIcons = {
  food: Utensils,
  place: Landmark,
  hotel: Hotel,
  nature: Palmtree,
  transport: Navigation,
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ'
}

function Logo({ onClick }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Về trang chủ">
      <span className="brand-mark"><Navigation size={18} strokeWidth={2.5} /></span>
      <span>Mây<span className="brand-dot">.</span></span>
    </button>
  )
}

function Header({ page, goTo, onLogin }) {
  const [open, setOpen] = useState(false)
  const navigate = (target) => {
    goTo(target)
    setOpen(false)
  }

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Logo onClick={() => navigate('home')} />
        <nav className={open ? 'nav-links open' : 'nav-links'}>
          <button className={page === 'home' ? 'active' : ''} onClick={() => navigate('home')}>Khám phá</button>
          <button className={page === 'create' ? 'active' : ''} onClick={() => navigate('create')}>Lên kế hoạch</button>
          <button className={page === 'trips' ? 'active' : ''} onClick={() => navigate('trips')}>Chuyến đi của tôi</button>
        </nav>
        <div className="nav-actions">
          <button className="ghost-button desktop-only" onClick={onLogin}><UserRound size={17} /> Đăng nhập</button>
          <button className="primary-button compact desktop-only" onClick={() => navigate('create')}>Tạo chuyến đi <ArrowRight size={16} /></button>
          <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Mở menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  )
}

function HomePage({ goTo, form, setForm }) {
  const selectDestination = (city) => {
    setForm((current) => ({ ...current, destination: city }))
    goTo('create')
  }

  return (
    <main>
      <section className="hero page-shell">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={15} /> Du lịch thông minh cùng AI</span>
          <h1>Đi xa hơn.<br /><em>Lên kế hoạch nhẹ hơn.</em></h1>
          <p>Mây biến những điều bạn yêu thích thành một hành trình trọn vẹn — lịch trình, chi phí và những trải nghiệm đáng nhớ.</p>
          <div className="trust-row">
            <div className="avatar-stack">
              <span>HN</span><span>TL</span><span>AN</span>
            </div>
            <div><strong>12.000+</strong><small>hành trình đã được tạo</small></div>
            <div className="rating"><Star size={15} fill="currentColor" /> 4.9</div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image" role="img" aria-label="Khung cảnh du lịch biển Việt Nam" />
          <div className="floating-card weather-card">
            <span className="weather-icon">☀️</span>
            <div><strong>28°C</strong><small>Đà Nẵng, Việt Nam</small></div>
          </div>
          <div className="floating-card ai-card">
            <span className="mini-ai"><Sparkles size={15} /></span>
            <div><small>AI vừa tìm thấy</small><strong>8 trải nghiệm hợp gu bạn</strong></div>
          </div>
          <div className="route-line" />
        </div>

        <form className="quick-planner" onSubmit={(event) => { event.preventDefault(); goTo('create') }}>
          <label>
            <span><MapPin size={15} /> Điểm đến</span>
            <input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} placeholder="Bạn muốn đi đâu?" />
          </label>
          <label>
            <span><CalendarDays size={15} /> Thời gian</span>
            <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
          </label>
          <label>
            <span><Users size={15} /> Đồng hành</span>
            <select value={form.travelWith} onChange={(event) => setForm({ ...form, travelWith: event.target.value })}>
              <option>Cặp đôi</option><option>Một mình</option><option>Bạn bè</option><option>Gia đình</option>
            </select>
          </label>
          <button className="primary-button search-button" type="submit"><Sparkles size={18} /> Tạo lịch trình</button>
        </form>
      </section>

      <section className="section page-shell">
        <div className="section-heading">
          <div><span className="section-kicker">Cảm hứng cho bạn</span><h2>Đi đâu cho chuyến tới?</h2></div>
          <button className="text-button">Xem tất cả <ArrowRight size={16} /></button>
        </div>
        <div className="destination-grid">
          {destinationCards.map((destination, index) => (
            <button className="destination-card" onClick={() => selectDestination(destination.city)} key={destination.city}>
              <img src={destination.image} alt={destination.city} />
              <span className="image-shade" />
              <span className="destination-number">0{index + 1}</span>
              <span className="destination-content">
                <small>{destination.days}</small>
                <strong>{destination.city}</strong>
                <span>{destination.meta}</span>
              </span>
              <span className="round-arrow"><ArrowRight size={18} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="how-section">
        <div className="page-shell">
          <div className="center-heading"><span className="section-kicker">Đơn giản & cá nhân hóa</span><h2>Ba bước cho một chuyến đi tuyệt vời</h2></div>
          <div className="steps-grid">
            {[
              [<MapPin key="pin" />, '01', 'Kể Mây nghe', 'Chọn nơi đến, ngân sách và những điều khiến bạn hào hứng.'],
              [<Sparkles key="sparkles" />, '02', 'AI lên kế hoạch', 'Mây thiết kế lịch trình tối ưu theo sở thích riêng của bạn.'],
              [<Plane key="plane" />, '03', 'Xách ba lô lên', 'Tinh chỉnh, lưu lại và tận hưởng từng khoảnh khắc.'],
            ].map(([icon, no, title, description]) => (
              <div className="step-card" key={no}>
                <span className="step-no">{no}</span><span className="step-icon">{icon}</span>
                <h3>{title}</h3><p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function CreateTripPage({ form, setForm, onGenerate, generating, onBack }) {
  const toggleInterest = (interest) => {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }))
  }

  return (
    <main className="create-page page-shell inner-page">
      <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Quay lại</button>
      <div className="create-layout">
        <aside className="create-intro">
          <span className="eyebrow light"><Sparkles size={15} /> AI Trip Designer</span>
          <h1>Hành trình của bạn bắt đầu từ đây.</h1>
          <p>Cho Mây biết một chút về chuyến đi. Càng chi tiết, lịch trình càng đúng với bạn.</p>
          <div className="progress-list">
            <div className="done"><span><Check size={15} /></span><div><strong>Thông tin cơ bản</strong><small>Điểm đến & thời gian</small></div></div>
            <div className="current"><span>2</span><div><strong>Sở thích cá nhân</strong><small>Gu du lịch của bạn</small></div></div>
            <div><span>3</span><div><strong>Để Mây lo</strong><small>Tạo lịch trình bằng AI</small></div></div>
          </div>
          <div className="quote-card"><Sparkles size={19} /><p>“Mỗi chuyến đi nên mang một câu chuyện của riêng bạn.”</p></div>
        </aside>

        <section className="form-card">
          <div className="form-title"><span>01</span><div><h2>Thông tin chuyến đi</h2><p>Những thông tin cơ bản để bắt đầu</p></div></div>
          <div className="field-grid">
            <label className="field full"><span>Điểm đến</span><div className="input-wrap"><MapPin size={18} /><input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} placeholder="Ví dụ: Đà Nẵng" /></div></label>
            <label className="field"><span>Ngày bắt đầu</span><div className="input-wrap"><CalendarDays size={18} /><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></div></label>
            <label className="field"><span>Ngày kết thúc</span><div className="input-wrap"><CalendarDays size={18} /><input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></div></label>
            <label className="field full"><span>Ngân sách dự kiến</span><div className="input-wrap"><CircleDollarSign size={18} /><input type="number" min="0" step="100000" value={form.budget} onChange={(event) => setForm({ ...form, budget: Number(event.target.value) })} /><b>VNĐ</b></div></label>
          </div>

          <div className="form-divider" />
          <div className="form-title"><span>02</span><div><h2>Bạn thích đi như thế nào?</h2><p>Chọn những gì phù hợp nhất với bạn</p></div></div>

          <div className="choice-section"><label>Đi cùng ai?</label><div className="choice-row">
            {['Một mình', 'Cặp đôi', 'Bạn bè', 'Gia đình'].map((option) => <button className={form.travelWith === option ? 'choice active' : 'choice'} onClick={() => setForm({ ...form, travelWith: option })} key={option} type="button">{option}</button>)}
          </div></div>

          <div className="choice-section"><label>Sở thích <small>Chọn nhiều mục</small></label><div className="chip-row">
            {interestOptions.map((interest) => <button className={form.interests.includes(interest) ? 'interest-chip active' : 'interest-chip'} onClick={() => toggleInterest(interest)} key={interest} type="button">{form.interests.includes(interest) && <Check size={14} />}{interest}</button>)}
          </div></div>

          <div className="choice-section"><label>Phong cách du lịch</label><div className="style-options">
            {[
              ['Tiết kiệm', 'Tối ưu từng khoản', '₫'],
              ['Cân bằng', 'Thoải mái vừa đủ', '₫₫'],
              ['Cao cấp', 'Trải nghiệm trọn vẹn', '₫₫₫'],
            ].map(([title, description, price]) => <button type="button" onClick={() => setForm({ ...form, style: title })} className={form.style === title ? 'style-option active' : 'style-option'} key={title}><span className="radio-dot" /><div><strong>{title}</strong><small>{description}</small></div><b>{price}</b></button>)}
          </div></div>

          <button className="generate-button" onClick={onGenerate} disabled={generating || !form.destination}>
            {generating ? <><RefreshCw className="spin" size={19} /> Mây đang thiết kế hành trình...</> : <><Sparkles size={19} /> Tạo lịch trình với AI <ArrowRight size={18} /></>}
          </button>
          <p className="form-note"><Sparkles size={13} /> AI sẽ mất khoảng vài giây để tạo lịch trình phù hợp nhất.</p>
        </section>
      </div>
    </main>
  )
}

function BudgetPanel({ budget }) {
  return (
    <section className="budget-card">
      <div className="panel-heading"><div><span className="section-kicker">Ngân sách thông minh</span><h2>Phân bổ dự kiến</h2></div><button className="icon-button"><Pencil size={17} /></button></div>
      <div className="budget-summary">
        <div className="donut"><div><small>Tổng cộng</small><strong>{(budget / 1000000).toFixed(1)}M</strong><span>VNĐ</span></div></div>
        <div className="budget-legend">
          {budgetItems.map((item) => <div key={item.label}><span className="legend-dot" style={{ background: item.color }} /><span>{item.label}</span><strong>{item.percent}%</strong></div>)}
        </div>
      </div>
      <div className="budget-list">
        {budgetItems.map((item) => {
          const Icon = item.icon
          const adjustedValue = budget * (item.percent / 100)
          return <div className="budget-row" key={item.label}><span className="budget-icon" style={{ color: item.color, background: `${item.color}15` }}><Icon size={17} /></span><span>{item.label}</span><strong>{formatMoney(adjustedValue)}</strong></div>
        })}
      </div>
      <div className="budget-safe"><Check size={17} /><div><strong>Trong phạm vi ngân sách</strong><small>Bạn vẫn có 500.000đ dự phòng</small></div></div>
    </section>
  )
}

function ChatPanel() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Chào bạn! Mình có thể giúp điều chỉnh lịch trình, tìm quán ăn hoặc gợi ý điểm đến phù hợp ngân sách.' },
  ])

  const sendMessage = (event) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return
    setMessages((current) => [...current, { role: 'user', text: trimmed }])
    setMessage('')
    window.setTimeout(() => {
      setMessages((current) => [...current, { role: 'assistant', text: 'Bạn có thể thay Bà Nà Hills bằng bán đảo Sơn Trà và chùa Linh Ứng. Lựa chọn này giúp tiết kiệm khoảng 500.000đ và phù hợp để ngắm cảnh.' }])
    }, 450)
  }

  return (
    <section className="chat-card">
      <div className="chat-header"><span className="bot-avatar"><Bot size={19} /></span><div><strong>Trợ lý Mây</strong><small><span /> Luôn sẵn sàng</small></div><button className="icon-button"><ChevronDown size={17} /></button></div>
      <div className="chat-body">
        {messages.map((item, index) => <div className={`chat-bubble ${item.role}`} key={`${item.role}-${index}`}>{item.text}</div>)}
      </div>
      <div className="suggestion-row"><button onClick={() => setMessage('Gợi ý quán ăn gần biển')}>🍜 Quán ăn gần đây</button><button onClick={() => setMessage('Có điểm nào thay thế không?')}>✨ Đổi địa điểm</button></div>
      <form className="chat-input" onSubmit={sendMessage}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Hỏi Mây về chuyến đi..." /><button aria-label="Gửi tin nhắn"><Send size={17} /></button></form>
    </section>
  )
}

function ItineraryPage({ form, onSave, saved }) {
  const [activeDay, setActiveDay] = useState(1)
  const [assistantOpen, setAssistantOpen] = useState(true)
  const dayData = itinerary.find((item) => item.day === activeDay)

  return (
    <main className="itinerary-page inner-page">
      <section className="trip-banner">
        <div className="page-shell banner-inner">
          <div><span className="eyebrow light"><Sparkles size={14} /> Được thiết kế bởi Mây AI</span><h1>{form.destination || 'Đà Nẵng'} — hành trình của riêng bạn</h1><p><CalendarDays size={16} /> 20–23 tháng 10, 2026 <span /> <Users size={16} /> {form.travelWith} <span /> <WalletCards size={16} /> {formatMoney(form.budget)}</p></div>
          <div className="banner-actions"><button className="secondary-button"><RefreshCw size={17} /> Tạo lại</button><button className={saved ? 'primary-button saved' : 'primary-button'} onClick={onSave}>{saved ? <Check size={17} /> : <Save size={17} />}{saved ? 'Đã lưu' : 'Lưu chuyến đi'}</button></div>
        </div>
      </section>

      <div className="page-shell itinerary-layout">
        <div className="itinerary-main">
          <div className="day-tabs">
            {itinerary.map((item) => <button className={activeDay === item.day ? 'active' : ''} onClick={() => setActiveDay(item.day)} key={item.day}><span>Ngày {item.day}</span><small>{item.label}</small></button>)}
          </div>

          <section className="timeline-card">
            <div className="timeline-title"><div><span className="date-box"><strong>{19 + activeDay}</strong><small>THG 10</small></span><div><h2>Ngày {activeDay} tại {form.destination}</h2><p>{dayData.label} · 5 hoạt động</p></div></div><button className="secondary-button small"><Plus size={16} /> Thêm hoạt động</button></div>
            <div className="timeline">
              {dayData.activities.map((activity, index) => {
                const Icon = activityIcons[activity.type]
                return <div className="timeline-item" key={`${activity.time}-${activity.title}`}>
                  <div className="time"><strong>{activity.time}</strong><small>{index === dayData.activities.length - 1 ? 'Kết thúc' : 'Khoảng 2 giờ'}</small></div>
                  <span className={`activity-icon ${activity.type}`}><Icon size={18} /></span>
                  <div className="activity-copy"><h3>{activity.title}</h3><p>{activity.note}</p><span><MapPin size={13} /> {form.destination}, Việt Nam</span></div>
                  <div className="activity-cost"><strong>{activity.cost}</strong><button aria-label="Chỉnh sửa"><Pencil size={15} /></button></div>
                </div>
              })}
            </div>
          </section>
        </div>

        <aside className="itinerary-side">
          <BudgetPanel budget={form.budget || 5000000} />
          {assistantOpen ? <ChatPanel /> : <button className="open-assistant" onClick={() => setAssistantOpen(true)}><MessageCircle /> Mở trợ lý Mây</button>}
          {assistantOpen && <button className="close-chat" onClick={() => setAssistantOpen(false)}>Ẩn trợ lý</button>}
        </aside>
      </div>
    </main>
  )
}

function TripsPage({ trips, goTo }) {
  return (
    <main className="trips-page page-shell inner-page">
      <div className="section-heading trips-heading"><div><span className="section-kicker">Bộ sưu tập hành trình</span><h1>Chuyến đi của tôi</h1><p>Mọi hành trình đáng nhớ đều bắt đầu từ một kế hoạch nhỏ.</p></div><button className="primary-button" onClick={() => goTo('create')}><Plus size={17} /> Tạo chuyến đi mới</button></div>
      <div className="trip-stats">
        <div><Compass /><span><strong>{trips.length}</strong><small>Chuyến đi</small></span></div>
        <div><CalendarDays /><span><strong>{trips.reduce((sum, trip) => sum + trip.days, 0)}</strong><small>Ngày khám phá</small></span></div>
        <div><Map /><span><strong>{trips.length}</strong><small>Thành phố</small></span></div>
      </div>
      <div className="trips-grid">
        {trips.map((trip, index) => <article className={`saved-trip-card ${trip.color}`} key={`${trip.id}-${index}`}>
          <div className="trip-art"><span>{trip.emoji}</span><button><Heart size={17} fill="currentColor" /></button><small>{index === 0 ? 'Sắp tới' : 'Đã lên kế hoạch'}</small></div>
          <div className="trip-card-body"><span className="trip-date"><CalendarDays size={14} /> {trip.date}</span><h2>{trip.city}</h2><div className="trip-meta"><span><Clock3 size={14} /> {trip.days} ngày</span><span><WalletCards size={14} /> {trip.budget}</span></div><button onClick={() => goTo('itinerary')}>Xem hành trình <ArrowRight size={16} /></button></div>
        </article>)}
        <button className="new-trip-card" onClick={() => goTo('create')}><span><Plus /></span><strong>Lên kế hoạch mới</strong><small>Hành trình tiếp theo đang chờ bạn</small></button>
      </div>
    </main>
  )
}

function LoginModal({ onClose }) {
  const [done, setDone] = useState(false)
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="login-modal" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" onClick={onClose}><X size={19} /></button>
    <Logo onClick={() => {}} />
    {done ? <div className="login-success"><span><Check /></span><h2>Chào mừng trở lại!</h2><p>Bạn đã đăng nhập vào tài khoản demo.</p><button className="primary-button" onClick={onClose}>Tiếp tục khám phá</button></div> : <>
      <h2>Chào mừng trở lại</h2><p>Đăng nhập để tiếp tục hành trình của bạn.</p>
      <form onSubmit={(event) => { event.preventDefault(); setDone(true) }}><label>Email<input type="email" required placeholder="ban@email.com" /></label><label>Mật khẩu<input type="password" required placeholder="••••••••" /></label><button className="primary-button" type="submit">Đăng nhập <ArrowRight size={17} /></button></form>
      <small className="demo-note">Bản demo giao diện — chưa kết nối Supabase Auth.</small>
    </>}
  </div></div>
}

function Footer({ goTo }) {
  return <footer><div className="page-shell footer-inner"><div><Logo onClick={() => goTo('home')} /><p>Biến cảm hứng thành hành trình.</p></div><div className="footer-links"><button onClick={() => goTo('home')}>Khám phá</button><button onClick={() => goTo('create')}>Lên kế hoạch</button><button onClick={() => goTo('trips')}>Chuyến đi</button></div><span>© 2026 Mây AI Travel Planner</span></div></footer>
}

export default function App() {
  const [page, setPage] = useState('home')
  const [generating, setGenerating] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [form, setForm] = useState({ destination: 'Đà Nẵng', startDate: '2026-10-20', endDate: '2026-10-23', budget: 5000000, travelWith: 'Cặp đôi', interests: ['Ẩm thực', 'Biển', 'Chụp ảnh'], style: 'Cân bằng' })
  const [trips, setTrips] = useState(() => {
    try {
      const storedTrips = window.localStorage.getItem('may-trips')
      return storedTrips ? JSON.parse(storedTrips) : starterTrips
    } catch {
      return starterTrips
    }
  })

  const goTo = (target) => {
    setPage(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleGenerate = () => {
    setGenerating(true)
    window.setTimeout(() => {
      setGenerating(false)
      setSaved(false)
      goTo('itinerary')
    }, 1000)
  }

  const tripExists = useMemo(() => trips.some((trip) => trip.city === form.destination), [trips, form.destination])
  const handleSave = () => {
    setSaved(true)
    if (!tripExists) {
      setTrips((current) => {
        const nextTrips = [{ id: Date.now(), city: form.destination, date: '20–23 Thg 10, 2026', days: 3, budget: `${(form.budget / 1000000).toFixed(0)} triệu`, color: 'green', emoji: '✈️' }, ...current]
        window.localStorage.setItem('may-trips', JSON.stringify(nextTrips))
        return nextTrips
      })
    }
  }

  return (
    <div className="app">
      <Header page={page} goTo={goTo} onLogin={() => setLoginOpen(true)} />
      {page === 'home' && <HomePage goTo={goTo} form={form} setForm={setForm} />}
      {page === 'create' && <CreateTripPage form={form} setForm={setForm} onGenerate={handleGenerate} generating={generating} onBack={() => goTo('home')} />}
      {page === 'itinerary' && <ItineraryPage form={form} onSave={handleSave} saved={saved} />}
      {page === 'trips' && <TripsPage trips={trips} goTo={goTo} />}
      <Footer goTo={goTo} />
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </div>
  )
}
