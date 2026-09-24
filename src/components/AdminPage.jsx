import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { summarizeTripQuota } from '../lib/tripQuota'
import './admin.css'

const PAGE_SIZE = 20

export default function AdminPage({ currentUserId }) {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [grantAmounts, setGrantAmounts] = useState({})

  useEffect(() => {
    let active = true
    async function loadUsers() {
      const from = pageIndex * PAGE_SIZE
      let query = supabase.from('app_users')
        .select('id, email, role, generations_used, bonus_generations, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)
      if (filter) query = query.ilike('email', `%${filter}%`)
      const { data, count, error } = await query
      if (!active) return
      setLoading(false)
      if (error) {
        setUsers([])
        setTotal(0)
        setFeedback({ type: 'error', text: 'Không tải được danh sách. Kiểm tra quyền admin và cấu hình Supabase.' })
        return
      }
      setUsers(data || [])
      setTotal(count || 0)
    }
    loadUsers()
    return () => { active = false }
  }, [pageIndex, filter, refreshKey])

  const findUsers = (event) => {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)
    setPageIndex(0)
    setFilter(search.trim())
    setRefreshKey((value) => value + 1)
  }

  const changeRole = async (user, role) => {
    if (user.id === currentUserId || updatingId || role === user.role) return
    if (!window.confirm(`Đổi quyền của ${user.email || 'tài khoản này'} thành ${role === 'admin' ? 'quản trị viên' : 'người dùng'}?`)) return
    setUpdatingId(user.id)
    setFeedback(null)
    try {
      const { data, error } = await supabase.from('app_users')
        .update({ role })
        .eq('id', user.id)
        .select('id, role')
        .maybeSingle()
      if (error || !data) {
        setFeedback({ type: 'error', text: 'Không đổi được quyền. Hãy kiểm tra kết nối hoặc quyền admin.' })
        return
      }
      setUsers((current) => current.map((item) => item.id === data.id ? { ...item, role: data.role } : item))
      setFeedback({ type: 'success', text: 'Đã cập nhật quyền người dùng.' })
    } catch {
      setFeedback({ type: 'error', text: 'Không đổi được quyền. Hãy kiểm tra kết nối rồi thử lại.' })
    } finally {
      setUpdatingId(null)
    }
  }

  const grantCredits = async (user) => {
    if (updatingId) return
    const amount = Number(grantAmounts[user.id] ?? 1)
    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      setFeedback({ type: 'error', text: 'Chỉ có thể cấp từ 1 đến 100 lượt mỗi lần.' })
      return
    }
    if (!window.confirm(`Cấp thêm ${amount} lượt tạo chuyến đi cho ${user.email || 'tài khoản này'}?`)) return
    setUpdatingId(user.id)
    setFeedback(null)
    try {
      const { error } = await supabase.from('trip_credit_grants')
        .insert({ user_id: user.id, amount })
      if (error) {
        setFeedback({ type: 'error', text: 'Không cấp được lượt. Hãy chạy trip_quota.sql và kiểm tra quyền admin.' })
        return
      }
      const { data, error: reloadError } = await supabase.from('app_users')
        .select('id,generations_used,bonus_generations').eq('id', user.id).single()
      if (!reloadError) setUsers((current) => current.map((item) => item.id === user.id ? { ...item, ...data } : item))
      else setRefreshKey((value) => value + 1)
      setFeedback({ type: 'success', text: `Đã cấp thêm ${amount} lượt cho ${user.email || 'tài khoản'}.` })
    } catch {
      setFeedback({ type: 'error', text: 'Không cấp được lượt. Hãy kiểm tra kết nối rồi thử lại.' })
    } finally {
      setUpdatingId(null)
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return <main className="admin-page inner-page">
    <div className="page-shell">
      <div className="admin-heading"><div><span className="section-kicker"><ShieldCheck size={15} /> TRIPGENIE / QUẢN TRỊ</span><h1>Người dùng và lượt tạo</h1><p>Phân quyền và cấp thêm lượt lập kế hoạch cho từng tài khoản. Quyền xem chuyến đi của người dùng vẫn được bảo vệ riêng trong Supabase.</p></div><span className="admin-count"><Users size={17} /> {total} tài khoản</span></div>

      <div className="admin-role-guide"><div><strong>Người dùng</strong><p>Có 1 lượt tạo ban đầu; vẫn xem và sửa chuyến đã lưu khi hết lượt.</p></div><div><strong>Quản trị viên</strong><p>Cấp thêm lượt tạo và quản lý quyền quản trị. Lượt đã dùng không hoàn lại khi xóa chuyến.</p></div></div>

      <section className="admin-users" aria-labelledby="admin-users-heading">
        <div className="admin-users-toolbar"><div><h2 id="admin-users-heading">Danh sách tài khoản</h2><p>Tài khoản của bạn được giữ quyền admin để tránh tự khóa trang quản trị.</p></div><button type="button" className="admin-refresh" onClick={() => { setLoading(true); setRefreshKey((value) => value + 1) }} aria-label="Tải lại danh sách"><RefreshCw size={17} /></button></div>
        <form className="admin-search" onSubmit={findUsers}><label htmlFor="admin-email-search"><Search size={17} /><input id="admin-email-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo email" /></label><button type="submit">Tìm tài khoản</button></form>
        {feedback && <p className={`admin-feedback ${feedback.type}`} role="status">{feedback.text}</p>}
        <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Tài khoản</th><th>Ngày tham gia</th><th>Lượt tạo</th><th>Vai trò</th></tr></thead><tbody>
          {loading ? <tr><td colSpan="4" className="admin-empty">Đang tải tài khoản...</td></tr> : users.length === 0 ? <tr><td colSpan="4" className="admin-empty">Không tìm thấy tài khoản phù hợp.</td></tr> : users.map((user) => {
            const quota = summarizeTripQuota(user)
            return <tr key={user.id}>
            <td><span className="admin-identity"><span className="admin-avatar">{(user.email || '?').slice(0, 1).toUpperCase()}</span><span className="admin-user-email">{user.email || 'Chưa có email'}{user.id === currentUserId && <small> Tài khoản của bạn</small>}</span></span></td>
            <td>{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
            <td><div className="admin-credit-cell"><strong>Còn {quota.remaining} lượt</strong><small>Đã tạo {quota.used} · admin cấp còn {quota.bonus}</small><div><input type="number" min="1" max="100" step="1" aria-label={`Số lượt cấp cho ${user.email || user.id}`} value={grantAmounts[user.id] ?? 1} onChange={(event) => setGrantAmounts((current) => ({ ...current, [user.id]: event.target.value }))} disabled={updatingId !== null} /><button type="button" onClick={() => grantCredits(user)} disabled={updatingId !== null}>Cấp lượt</button></div></div></td>
            <td><select aria-label={`Vai trò của ${user.email || user.id}`} value={user.role} disabled={user.id === currentUserId || updatingId !== null} onChange={(event) => changeRole(user, event.target.value)}><option value="user">Người dùng</option><option value="admin">Quản trị viên</option></select></td>
          </tr>})}
        </tbody></table></div>
        <div className="admin-pagination"><span>Trang {pageIndex + 1} / {pageCount}</span><div><button type="button" onClick={() => { setLoading(true); setPageIndex((value) => value - 1) }} disabled={pageIndex === 0 || loading} aria-label="Trang trước"><ArrowLeft size={17} /></button><button type="button" onClick={() => { setLoading(true); setPageIndex((value) => value + 1) }} disabled={pageIndex >= pageCount - 1 || loading} aria-label="Trang sau"><ArrowRight size={17} /></button></div></div>
      </section>
    </div>
  </main>
}
