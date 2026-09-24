import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, LogOut, Menu, RefreshCw, UserRound, X } from 'lucide-react'
import './App.css'
import { CreateTripPage, ItineraryPage, TripsPage } from './components/TripPages'
import AdminPage from './components/AdminPage'
import PricingPage from './components/PricingPage'
import './home.css'
import './travel-polish.css'
import HomePage from './components/home/HomePage'
import { activityTypeForCategory, createDefaultForm, generatePlan, planFromRow, toCreateSavedTripArgs, toTripPayload, validateTripForm } from './lib/tripPlanner'
import { summarizeTripQuota } from './lib/tripQuota'
import { supabase } from './lib/supabase'
import tripGenieLogo from './logo/tripgenie-mark.png'

const protectedPages = new Set(['create', 'itinerary', 'trips'])

function Logo({ onClick }) {
  return <button className="brand" onClick={onClick} aria-label="TripGenie — về trang chủ"><span className="brand-mark"><img src={tripGenieLogo} alt="" /></span><span>TripGenie</span></button>
}

function Header({ page, goTo, onLogin, session, onLogout, isAdmin }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 16)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  const navigate = (target) => { goTo(target); setOpen(false) }
  return <header className={['site-header', page === 'home' ? 'home-header' : '', scrolled ? 'scrolled' : ''].filter(Boolean).join(' ')}><div className="nav-shell">
    <Logo onClick={() => navigate('home')} />
    <nav className={open ? 'nav-links open' : 'nav-links'}>
      <button className={page === 'home' ? 'active' : ''} onClick={() => navigate('home')}>Khám phá</button>
      <button className={page === 'create' ? 'active' : ''} onClick={() => navigate('create')}>Lên kế hoạch</button>
      <button className={page === 'trips' ? 'active' : ''} onClick={() => navigate('trips')}>Chuyến đi của tôi</button>
      <button className={page === 'pricing' ? 'active' : ''} onClick={() => navigate('pricing')}>Bảng giá</button>
      {isAdmin && <button className={page === 'admin' ? 'active' : ''} onClick={() => navigate('admin')}>Quản trị</button>}
    </nav>
    <div className="nav-actions">
      {session ? <button className="user-chip desktop-only" onClick={onLogout} title="Đăng xuất"><span>{session.user.email?.slice(0, 1).toUpperCase()}</span><small>{session.user.email}</small><LogOut size={15} /></button>
        : <button className="ghost-button desktop-only" onClick={onLogin}><UserRound size={17} /> Đăng nhập</button>}
      <button className="primary-button compact desktop-only" onClick={() => navigate('create')}>Tạo chuyến đi <ArrowRight size={16} /></button>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Mở menu">{open ? <X /> : <Menu />}</button>
    </div>
  </div></header>
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
  return <footer><div className="page-shell footer-inner"><div><Logo onClick={() => goTo('home')} /><p>Biến cảm hứng thành hành trình.</p></div><div className="footer-links"><button onClick={() => goTo('home')}>Khám phá</button><button onClick={() => goTo('create')}>Lên kế hoạch</button><button onClick={() => goTo('trips')}>Chuyến đi</button><button onClick={() => goTo('pricing')}>Bảng giá</button></div><span>© 2026 TripGenie</span></div></footer>
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
  const [adminUserId, setAdminUserId] = useState(null)
  const [tripQuota, setTripQuota] = useState(null)
  const [toast, setToast] = useState('')
  const [generating, setGenerating] = useState(false)
  const generationInProgress = useRef(false)
  const isAdmin = Boolean(session?.user?.id && adminUserId === session.user.id)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) { setPage('home'); setPlan(null); setTrips([]); setAdminUserId(null); setTripQuota(null) }
    })
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) return
    let active = true
    const loadAccount = async () => {
      const { data, error } = await supabase.from('app_users').select('role,generations_used,bonus_generations').eq('id', session.user.id).maybeSingle()
      if (active) {
        setAdminUserId(!error && data?.role === 'admin' ? session.user.id : null)
        setTripQuota(!error ? summarizeTripQuota(data) : null)
      }
    }
    loadAccount()
    return () => { active = false }
  }, [session])
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

  const refreshTripQuota = async (userId) => {
    const { data, error } = await supabase.from('app_users').select('generations_used,bonus_generations').eq('id', userId).maybeSingle()
    if (!error) setTripQuota(summarizeTripQuota(data))
  }
  const openRegistrationFor = (target) => { setPendingPage(target); setAuthMode('register'); setLoginOpen(true) }
  const goTo = async (target) => {
    if (target === 'admin') {
      const { data: authData } = await supabase.auth.getSession()
      if (!authData.session) { openLogin(); return }
      const { data, error } = await supabase.from('app_users').select('role').eq('id', authData.session.user.id).maybeSingle()
      if (error || data?.role !== 'admin') { setAdminUserId(null); setToast('Tài khoản này không có quyền quản trị.'); return }
      setAdminUserId(authData.session.user.id)
    }
    if (protectedPages.has(target)) {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { openRegistrationFor(target); return }
      if (target === 'create') await refreshTripQuota(data.session.user.id)
    }
    if (target === 'pricing' && session?.user?.id) await refreshTripQuota(session.user.id)
    setPage(target === 'itinerary' && !plan ? 'create' : target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const updateForm = (nextForm) => { setForm(nextForm); setFormError('') }
  const handleGenerate = async () => {
    if (generationInProgress.current) return
    generationInProgress.current = true
    setGenerating(true)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { openRegistrationFor('create'); return }
      const error = validateTripForm(form)
      setFormError(error)
      if (error) return
      const nextPlan = generatePlan(form)
      const { data: savedRow, error: createError } = await supabase
        .rpc('create_saved_trip', toCreateSavedTripArgs(nextPlan)).single()
      if (createError || !savedRow) {
        if (createError?.message.includes('trip_limit_reached')) {
          await refreshTripQuota(data.session.user.id)
          setToast('Bạn đã hết lượt tạo chuyến đi. Xem bảng giá hoặc liên hệ quản trị viên để được cấp thêm lượt.')
          setPage('pricing')
        } else setToast('Không thể tạo chuyến đi. Hãy kiểm tra Chuyến đi của tôi và cấu hình auto_save.sql trước khi thử lại.')
        return
      }
      await refreshTripQuota(data.session.user.id)
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await new Promise((resolve) => setTimeout(resolve, 280))
      }
      const savedPlan = planFromRow(savedRow)
      setPlan(savedPlan)
      setTrips((current) => [savedPlan, ...current.filter((trip) => trip.id !== savedPlan.id)])
      setSaved(true)
      setPage('itinerary')
      setToast('Đã tạo và tự động lưu chuyến đi. Bạn có thể chỉnh sửa lịch trình và chi phí.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setToast('Không thể tạo chuyến đi. Hãy kiểm tra Chuyến đi của tôi trước khi thử lại.')
    } finally {
      generationInProgress.current = false
      setGenerating(false)
    }
  }
  const handleRegenerate = () => {
    if (!plan || !window.confirm('Tạo lại sẽ thay thế các chỉnh sửa chưa lưu. Tiếp tục?')) return
    setPlan({ ...generatePlan(plan.form), id: plan.id, generationEventId: plan.generationEventId })
    setSaved(false)
    setToast('Đã tạo lại lịch trình. Hãy kiểm tra và lưu nếu muốn giữ bản mới.')
  }
  const handleUpdateActivity = (dayNumber, activityId, changes) => {
    setPlan((current) => ({ ...current, days: current.days.map((day) => day.day !== dayNumber ? day : {
      ...day, activities: day.activities.map((activity) => activity.id !== activityId ? activity : {
        ...activity, ...changes,
        ...(Object.hasOwn(changes, 'category') ? { type: activityTypeForCategory(changes.category) } : {}),
        ...(Object.hasOwn(changes, 'cost') ? { cost: Math.max(0, Number(changes.cost) || 0) } : {}),
      }),
    }) }))
    setSaved(false)
  }
  const handleAddActivity = (dayNumber) => {
    const id = window.crypto?.randomUUID?.() || 'custom-' + Date.now()
    setPlan((current) => ({ ...current, days: current.days.map((day) => day.day !== dayNumber ? day : {
      ...day, activities: [...day.activities, { id, time: '16:00', title: 'Hoạt động mới', category: 'Hoạt động', cost: 0, note: 'Thêm chi phí ước tính cho cả nhóm.', type: activityTypeForCategory('Hoạt động') }],
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
    if (!plan.id) { setToast('Chuyến đi chưa được tạo và lưu. Hãy thử tạo lại.'); return }
    if (plan.days.some((day) => day.activities.some((activity) => !activity.title.trim() || !activity.time))) {
      setToast('Hãy điền tên và giờ cho tất cả hoạt động trước khi lưu.')
      return
    }
    const { data: authData } = await supabase.auth.getSession()
    if (!authData.session) { openRegistrationFor('itinerary'); return }
    setSaving(true)
    const payload = toTripPayload(plan, authData.session.user.id)
    const { data, error } = await supabase.from('trips').update(payload).eq('id', plan.id).select().single()
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
    if (deletingId) return
    if (!window.confirm('Xóa chuyến đi ' + trip.form.destination + '? Hành động này không thể hoàn tác.')) return
    setDeletingId(trip.id)
    try {
      const { data, error } = await supabase.from('trips').delete().eq('id', trip.id).select('id').maybeSingle()
      if (error || !data) {
        setToast('Không xóa được chuyến đi. Hãy kiểm tra đăng nhập và thử lại.')
        return
      }
      setTrips((current) => current.filter((item) => item.id !== trip.id))
      if (plan?.id === trip.id) {
        setPlan(null)
        setSaved(false)
        if (page === 'itinerary') setPage('trips')
      }
      setToast('Đã xóa chuyến đi.')
    } catch {
      setToast('Không xóa được chuyến đi. Hãy kiểm tra kết nối và thử lại.')
    } finally {
      setDeletingId(null)
    }
  }
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setToast('Bạn đã đăng xuất.')
  }
  const openLogin = () => { setPendingPage(null); setAuthMode('login'); setLoginOpen(true) }
  const closeLogin = () => { setPendingPage(null); setLoginOpen(false) }

  return <div className="app">
    <Header page={page} goTo={goTo} onLogin={openLogin} session={session} onLogout={handleLogout} isAdmin={isAdmin} />
    {page === 'home' && <HomePage goTo={goTo} form={form} setForm={updateForm} />}
    {page === 'create' && <CreateTripPage form={form} setForm={updateForm} onGenerate={handleGenerate} formError={formError} onBack={() => goTo('home')} generating={generating} tripQuota={tripQuota} onSeePlans={() => goTo('pricing')} />}
    {page === 'itinerary' && plan && <ItineraryPage key={plan.id || plan.form.destination + plan.form.startDate + plan.form.endDate} plan={plan} onSave={handleSave} saved={saved} saving={saving} onRegenerate={handleRegenerate} onUpdateActivity={handleUpdateActivity} onAddActivity={handleAddActivity} onDeleteActivity={handleDeleteActivity} onDelete={() => handleDeleteTrip(plan)} deleting={deletingId === plan.id} />}
    {page === 'trips' && <TripsPage trips={trips} goTo={goTo} onOpen={handleOpenTrip} onDelete={handleDeleteTrip} deletingId={deletingId} />}
    {page === 'pricing' && <PricingPage goTo={goTo} tripQuota={tripQuota} session={session} />}
    {page === 'admin' && (isAdmin ? <AdminPage currentUserId={session.user.id} /> : <main className="page-shell inner-page"><h1>Không có quyền truy cập</h1><p>Vui lòng đăng nhập bằng tài khoản quản trị.</p></main>)}
    <Footer goTo={goTo} />
    {loginOpen && <LoginModal onClose={closeLogin} initialMode={authMode} />}
    {toast && <button className="toast" onClick={() => setToast('')}><Check size={16} /> {toast}<X size={15} /></button>}
  </div>
}
