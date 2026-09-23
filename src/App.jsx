import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Compass, LogOut, MapPin, Menu, RefreshCw, UserRound, Users, WalletCards, X } from 'lucide-react'
import './App.css'
import { CreateTripPage, ItineraryPage, TripsPage } from './components/TripPages'
import { destinationNames, northernDestinations } from './data/northernDestinations'
import { addDays, countTripDays, createDefaultForm, generatePlan, planFromRow, toTripPayload, validateTripForm } from './lib/tripPlanner'
import { supabase } from './lib/supabase'
import tripGenieLogo from './logo/ChatGPT Image 14_47_22 23 thg 9, 2026.png'

const protectedPages = new Set(['create', 'itinerary', 'trips'])

function Logo({ onClick }) {
  return <button className="brand" onClick={onClick} aria-label="TripGenie — về trang chủ"><span className="brand-mark"><img src={tripGenieLogo} alt="" /></span><span>TripGenie</span></button>
}

function Header({ page, goTo, onLogin, session, onLogout }) {
  const [open, setOpen] = useState(false)
  const navigate = (target) => { goTo(target); setOpen(false) }
  return <header className="site-header"><div className="nav-shell">
    <Logo onClick={() => navigate('home')} />
    <nav className={open ? 'nav-links open' : 'nav-links'}>
      <button className={page === 'home' ? 'active' : ''} onClick={() => navigate('home')}>Khám phá</button>
      <button className={page === 'create' ? 'active' : ''} onClick={() => navigate('create')}>Lên kế hoạch</button>
      <button className={page === 'trips' ? 'active' : ''} onClick={() => navigate('trips')}>Chuyến đi của tôi</button>
    </nav>
    <div className="nav-actions">
      {session ? <button className="user-chip desktop-only" onClick={onLogout} title="Đăng xuất"><span>{session.user.email?.slice(0, 1).toUpperCase()}</span><small>{session.user.email}</small><LogOut size={15} /></button>
        : <button className="ghost-button desktop-only" onClick={onLogin}><UserRound size={17} /> Đăng nhập</button>}
      <button className="primary-button compact desktop-only" onClick={() => navigate('create')}>Tạo chuyến đi <ArrowRight size={16} /></button>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Mở menu">{open ? <X /> : <Menu />}</button>
    </div>
  </div></header>
}

function HomePage({ goTo, form, setForm }) {
  const selectDestination = (city) => {
    setForm((current) => ({ ...current, destination: city }))
    goTo('create')
  }
  const setTravelWith = (travelWith) => {
    const counts = { 'Một mình': 1, 'Cặp đôi': 2, 'Bạn bè': 3, 'Gia đình': 4 }
    setForm((current) => ({ ...current, travelWith, travelers: counts[travelWith] }))
  }
  const changeStartDate = (startDate) => {
    const dayCount = Math.max(1, countTripDays(form.startDate, form.endDate))
    setForm({ ...form, startDate, endDate: startDate ? addDays(startDate, dayCount - 1) : '' })
  }
  return <main>
    <section className="hero page-shell">
      <div className="hero-copy">
        <span className="eyebrow"><Compass size={15} /> Khám phá miền Bắc Việt Nam</span>
        <h1>Đi xa hơn.<br /><em>Lên kế hoạch rõ ràng hơn.</em></h1>
        <p>Chọn điểm đến, ngày đi và ngân sách. TripGenie gợi ý lịch trình từng ngày cùng bảng chi phí có thể chỉnh sửa và lưu lại.</p>
        <div className="home-honesty"><WalletCards size={18} /><span>Chi phí chỉ là ước tính tham khảo, không phải giá đặt chỗ.</span></div>
      </div>
      <div className="hero-visual">
        <div className="hero-image" role="img" aria-label="Cảnh núi non miền Bắc Việt Nam" />
        <div className="floating-card weather-card"><span className="weather-icon">🧭</span><div><strong>5 điểm đến</strong><small>Hà Nội · Hạ Long · Ninh Bình · Sa Pa · Hà Giang</small></div></div>
        <div className="floating-card ai-card"><span className="mini-ai"><WalletCards size={17} /></span><div><small>Dễ theo dõi</small><strong>Chi phí theo từng hoạt động</strong></div></div>
      </div>
      <form className="quick-planner" onSubmit={(event) => { event.preventDefault(); goTo('create') }}>
        <label><span><MapPin size={15} /> Điểm đến</span><select value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })}>{destinationNames.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span><CalendarDays size={15} /> Ngày đi</span><input type="date" value={form.startDate} onChange={(event) => changeStartDate(event.target.value)} /></label>
        <label><span><Users size={15} /> Đồng hành</span><select value={form.travelWith} onChange={(event) => setTravelWith(event.target.value)}><option>Cặp đôi</option><option>Một mình</option><option>Bạn bè</option><option>Gia đình</option></select></label>
        <button className="primary-button search-button" type="submit"><Compass size={18} /> Lên kế hoạch</button>
      </form>
    </section>
    <section className="section page-shell">
      <div className="section-heading"><div><span className="section-kicker">Bắt đầu từ miền Bắc</span><h2>Chọn điểm đến của bạn</h2></div></div>
      <div className="destination-grid">
        {northernDestinations.map((destination, index) => <button className="destination-card" style={{ background: destination.color }} onClick={() => selectDestination(destination.city)} key={destination.city}>
          <span className="destination-card-art" aria-hidden="true">{destination.emoji}</span><span className="image-shade" /><span className="destination-number">0{index + 1}</span>
          <span className="destination-content"><small>Từ {destination.minDays} ngày</small><strong>{destination.city}</strong><span>{destination.meta}</span></span><span className="round-arrow"><ArrowRight size={18} /></span>
        </button>)}
      </div>
    </section>
    <section className="how-section"><div className="page-shell">
      <div className="center-heading"><span className="section-kicker">Không cần API AI</span><h2>Từ ý tưởng đến kế hoạch có chi phí</h2></div>
      <div className="steps-grid">
        {[
          [<MapPin key="pin" />, '01', 'Chọn chuyến đi', 'Chọn nơi đến, ngày đi, số người và phong cách du lịch.'],
          [<CalendarDays key="calendar" />, '02', 'Xem lịch trình', 'Xem từng ngày và chỉnh hoạt động, giờ, khoản chi.'],
          [<WalletCards key="wallet" />, '03', 'Kiểm tra ngân sách', 'Tổng chi phí được cộng lại rồi lưu trong chuyến đi của bạn.'],
        ].map(([icon, no, title, description]) => <div className="step-card" key={no}><span className="step-no">{no}</span><span className="step-icon">{icon}</span><h3>{title}</h3><p>{description}</p></div>)}
      </div>
    </div></section>
  </main>
}

function LoginModal({ onClose, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)
  const handleAuth = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (result.error) { setMessage(result.error.message); return }
    if (mode === 'register' && !result.data.session) { setMessage('Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản.'); return }
    setDone(true)
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="login-modal" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" onClick={onClose}><X size={19} /></button><Logo onClick={() => {}} />
    {done ? <div className="login-success"><span><Check /></span><h2>Chào mừng trở lại!</h2><p>Tài khoản Supabase của bạn đã được kết nối.</p><button className="primary-button" onClick={onClose}>Tiếp tục khám phá</button></div> : <>
      <h2>{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}</h2><p>{mode === 'login' ? 'Đăng nhập để tiếp tục hành trình của bạn.' : 'Đăng ký để tạo và lưu những chuyến đi của riêng bạn.'}</p>
      <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMessage('') }}>Đăng nhập</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMessage('') }}>Đăng ký</button></div>
      <form onSubmit={handleAuth}><label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@email.com" /></label><label>Mật khẩu<input type="password" minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tối thiểu 6 ký tự" /></label>{message && <p className="auth-message">{message}</p>}<button className="primary-button" type="submit" disabled={loading}>{loading ? <><RefreshCw className="spin" size={17} /> Đang xử lý...</> : <>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <ArrowRight size={17} /></>}</button></form>
      <small className="demo-note">Tài khoản được bảo mật bởi Supabase Auth.</small>
    </>}
  </div></div>
}

function Footer({ goTo }) {
  return <footer><div className="page-shell footer-inner"><div><Logo onClick={() => goTo('home')} /><p>Biến cảm hứng thành hành trình.</p></div><div className="footer-links"><button onClick={() => goTo('home')}>Khám phá</button><button onClick={() => goTo('create')}>Lên kế hoạch</button><button onClick={() => goTo('trips')}>Chuyến đi</button></div><span>© 2026 TripGenie</span></div></footer>
}

export default function App() {
  const [page, setPage] = useState('home')
  const [form, setForm] = useState(createDefaultForm)
  const [formError, setFormError] = useState('')
  const [plan, setPlan] = useState(null)
  const [trips, setTrips] = useState([])
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [pendingPage, setPendingPage] = useState(null)
  const [session, setSession] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) { setPage('home'); setPlan(null); setTrips([]) }
    })
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) return
    let active = true
    const loadTrips = async () => {
      const { data, error } = await supabase.from('trips').select('*').order('created_at', { ascending: false })
      if (!active) return
      if (error) { setToast('Không đọc được chuyến đi. Kiểm tra bảng trips và quyền truy cập trong Supabase.'); return }
      setTrips(data.map(planFromRow))
    }
    loadTrips()
    return () => { active = false }
  }, [session])
  useEffect(() => {
    if (session && pendingPage) {
      setPage(pendingPage === 'itinerary' && !plan ? 'create' : pendingPage)
      setPendingPage(null)
      setLoginOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [session, pendingPage, plan])

  const openRegistrationFor = (target) => { setPendingPage(target); setAuthMode('register'); setLoginOpen(true) }
  const goTo = async (target) => {
    if (protectedPages.has(target)) {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { openRegistrationFor(target); return }
    }
    setPage(target === 'itinerary' && !plan ? 'create' : target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const updateForm = (nextForm) => { setForm(nextForm); setFormError('') }
  const handleGenerate = async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { openRegistrationFor('create'); return }
    const error = validateTripForm(form)
    setFormError(error)
    if (error) return
    setPlan(generatePlan(form))
    setSaved(false)
    setPage('itinerary')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handleRegenerate = () => {
    if (!plan || !window.confirm('Tạo lại sẽ thay thế các chỉnh sửa chưa lưu. Tiếp tục?')) return
    setPlan(generatePlan(plan.form))
    setSaved(false)
    setToast('Đã tạo lại lịch trình. Hãy kiểm tra và lưu nếu muốn giữ bản mới.')
  }
  const handleUpdateActivity = (dayNumber, activityId, changes) => {
    setPlan((current) => ({ ...current, days: current.days.map((day) => day.day !== dayNumber ? day : {
      ...day, activities: day.activities.map((activity) => activity.id !== activityId ? activity : {
        ...activity, ...changes, ...(Object.hasOwn(changes, 'cost') ? { cost: Math.max(0, Number(changes.cost) || 0) } : {}),
      }),
    }) }))
    setSaved(false)
  }
  const handleAddActivity = (dayNumber) => {
    const id = window.crypto?.randomUUID?.() || 'custom-' + Date.now()
    setPlan((current) => ({ ...current, days: current.days.map((day) => day.day !== dayNumber ? day : {
      ...day, activities: [...day.activities, { id, time: '16:00', title: 'Hoạt động mới', category: 'Hoạt động', cost: 0, note: 'Thêm chi phí ước tính cho cả nhóm.', type: 'place' }],
    }) }))
    setSaved(false)
    return id
  }
  const handleDeleteActivity = (dayNumber, activityId) => {
    if (!window.confirm('Xóa hoạt động này khỏi lịch trình?')) return
    setPlan((current) => ({ ...current, days: current.days.map((day) => day.day !== dayNumber ? day : { ...day, activities: day.activities.filter((activity) => activity.id !== activityId) }) }))
    setSaved(false)
  }
  const handleSave = async () => {
    if (!plan || saving) return
    if (plan.days.some((day) => day.activities.some((activity) => !activity.title.trim() || !activity.time))) {
      setToast('Hãy điền tên và giờ cho tất cả hoạt động trước khi lưu.')
      return
    }
    const { data: authData } = await supabase.auth.getSession()
    if (!authData.session) { openRegistrationFor('itinerary'); return }
    setSaving(true)
    const payload = toTripPayload(plan, authData.session.user.id)
    const query = plan.id
      ? supabase.from('trips').update(payload).eq('id', plan.id)
      : supabase.from('trips').insert(payload)
    const { data, error } = await query.select().single()
    setSaving(false)
    if (error) { setToast('Không lưu được chuyến đi. Kiểm tra kết nối Supabase và quyền của bảng trips.'); return }
    const savedPlan = planFromRow(data)
    setPlan(savedPlan)
    setTrips((current) => [savedPlan, ...current.filter((trip) => trip.id !== savedPlan.id)])
    setSaved(true)
    setToast('Đã lưu lịch trình và chi phí vào Supabase!')
  }
  const handleOpenTrip = (trip) => {
    setPlan(trip)
    setForm(trip.form)
    setSaved(true)
    setPage('itinerary')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handleDeleteTrip = async (trip) => {
    if (!window.confirm('Xóa chuyến đi ' + trip.form.destination + '? Hành động này không thể hoàn tác.')) return
    setDeletingId(trip.id)
    const { error } = await supabase.from('trips').delete().eq('id', trip.id)
    setDeletingId(null)
    if (error) { setToast('Không xóa được chuyến đi. Vui lòng thử lại.'); return }
    setTrips((current) => current.filter((item) => item.id !== trip.id))
    if (plan?.id === trip.id) { setPlan(null); setSaved(false) }
    setToast('Đã xóa chuyến đi.')
  }
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setToast('Bạn đã đăng xuất.')
  }
  const openLogin = () => { setPendingPage(null); setAuthMode('login'); setLoginOpen(true) }
  const closeLogin = () => { setPendingPage(null); setLoginOpen(false) }

  return <div className="app">
    <Header page={page} goTo={goTo} onLogin={openLogin} session={session} onLogout={handleLogout} />
    {page === 'home' && <HomePage goTo={goTo} form={form} setForm={updateForm} />}
    {page === 'create' && <CreateTripPage form={form} setForm={updateForm} onGenerate={handleGenerate} formError={formError} onBack={() => goTo('home')} />}
    {page === 'itinerary' && plan && <ItineraryPage key={plan.id || plan.form.destination + plan.form.startDate + plan.form.endDate} plan={plan} onSave={handleSave} saved={saved} saving={saving} onRegenerate={handleRegenerate} onUpdateActivity={handleUpdateActivity} onAddActivity={handleAddActivity} onDeleteActivity={handleDeleteActivity} />}
    {page === 'trips' && <TripsPage trips={trips} goTo={goTo} onOpen={handleOpenTrip} onDelete={handleDeleteTrip} deletingId={deletingId} />}
    <Footer goTo={goTo} />
    {loginOpen && <LoginModal onClose={closeLogin} initialMode={authMode} />}
    {toast && <button className="toast" onClick={() => setToast('')}><Check size={16} /> {toast}<X size={15} /></button>}
  </div>
}
