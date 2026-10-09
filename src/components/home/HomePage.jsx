import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, CalendarDays, Clock, CloudSun, Compass, ExternalLink, Map, MapPin, Newspaper, RotateCcw, Route, Search, ShieldCheck, Sparkles, Users, WalletCards } from 'lucide-react'
import PersistentTravelScene from '../3d/PersistentTravelScene'
import { destinationImages, destinationImageSets } from '../../data/destinationImages'
import { destinationNames, northernDestinations } from '../../data/northernDestinations'
import { departurePointNames } from '../../data/departurePoints'
import { addDays, countTripDays, createDefaultForm, generatePlan, summarizePlan } from '../../lib/tripPlanner'

const formatVnd = (value) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
const sampleForm = createDefaultForm()
const samplePlan = generatePlan(sampleForm)
const sampleSummary = summarizePlan(samplePlan)
const destinationComparisons = northernDestinations.map((destination) => {
  const form = {
    ...sampleForm,
    destination: destination.city,
    travelers: 1,
    travelWith: 'Một mình',
    budget: 10000000,
  }
  return { destination, estimate: summarizePlan(generatePlan(form)).planned }
})
const destinationQuickNotes = {
  'Hà Nội': 'Phố cổ, hồ Hoàn Kiếm và những lớp lịch sử trong lòng thủ đô.',
  'Hạ Long': 'Vịnh biển, bãi tắm và hành trình khám phá hang động.',
  'Ninh Bình': 'Sông nước Tràng An, núi đá vôi và dấu tích cố đô Hoa Lư.',
  'Sa Pa': 'Thung lũng Mường Hoa, bản làng vùng cao và những cung trekking.',
  'Hà Giang': 'Cao nguyên đá, đèo núi và những điểm dừng giàu bản sắc.',
}

const normalizeSearch = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9]/g, '')

const formatNewsDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Mới cập nhật'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export default function HomePage({ goTo, form, setForm, onExplore }) {
  const [activeDestination, setActiveDestination] = useState('Ninh Bình')
  const [exploreFlipped, setExploreFlipped] = useState(false)
  const [destinationQuery, setDestinationQuery] = useState('')
  const [searchError, setSearchError] = useState('')
  const [travelNews, setTravelNews] = useState({ articles: [], loading: true, error: '' })
  const exploreStageRef = useRef(null)
  const exploreOpenRef = useRef(null)
  const exploreCloseRef = useRef(null)
  const exploreHoverRef = useRef(false)
  const active = northernDestinations.find((destination) => destination.city === activeDestination) || northernDestinations[0]
  const activeImageSet = destinationImageSets[active.city]
  const normalizedQuery = normalizeSearch(destinationQuery)
  const literalQuery = destinationQuery.trim().toLocaleLowerCase('vi-VN')
  const searchResults = normalizedQuery
    ? northernDestinations
      .filter((destination) => normalizeSearch(destination.city).includes(normalizedQuery))
      .sort((first, second) => Number(second.city.toLocaleLowerCase('vi-VN').startsWith(literalQuery)) - Number(first.city.toLocaleLowerCase('vi-VN').startsWith(literalQuery)))
    : []

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const sections = document.querySelectorAll('.immersive-home .home-reveal')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.08 })
    sections.forEach((section) => { section.classList.add('will-reveal'); observer.observe(section) })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/travel-news', { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Không thể tải tin du lịch.')
        return payload
      })
      .then((payload) => setTravelNews({ articles: payload.articles || [], loading: false, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') setTravelNews({ articles: [], loading: false, error: error.message })
      })
    return () => controller.abort()
  }, [])

  const selectDestination = (city) => {
    setForm((current) => ({ ...current, destination: city }))
    goTo('create')
  }
  const openExploreDetails = () => {
    setExploreFlipped(true)
    window.requestAnimationFrame(() => exploreCloseRef.current?.focus())
  }
  const closeExploreDetails = () => {
    setExploreFlipped(false)
    window.requestAnimationFrame(() => exploreOpenRef.current?.focus())
  }
  const chooseExploreDestination = (city) => {
    setExploreFlipped(false)
    setActiveDestination(city)
  }
  const setTravelWith = (travelWith) => {
    const counts = { 'Một mình': 1, 'Cặp đôi': 2, 'Bạn bè': 3, 'Gia đình': 4 }
    setForm((current) => ({ ...current, travelWith, travelers: counts[travelWith] }))
  }
  const changeStartDate = (startDate) => {
    const dayCount = Math.max(1, countTripDays(form.startDate, form.endDate))
    setForm({ ...form, startDate, endDate: startDate ? addDays(startDate, dayCount - 1) : '' })
  }
  const submitDestinationSearch = (event) => {
    event.preventDefault()
    const match = searchResults.find((destination) => destination.city.toLocaleLowerCase('vi-VN') === literalQuery)
      || searchResults.find((destination) => normalizeSearch(destination.city) === normalizedQuery)
      || searchResults[0]
    if (!match) {
      setSearchError('Hãy chọn một điểm đến miền Bắc đang được TripGenie hỗ trợ.')
      return
    }
    setSearchError('')
    setActiveDestination(match.city)
    onExplore(match.city)
  }
  const chooseSearchResult = (city) => {
    setDestinationQuery(city)
    setSearchError('')
    setActiveDestination(city)
    onExplore(city)
  }

  return <main className="immersive-home">
    <PersistentTravelScene destinations={northernDestinations} activeDestination={activeDestination} />
    <section className="home-hero" aria-labelledby="hero-heading">
      <div className="home-hero-haze" aria-hidden="true" />
      <div className="home-hero-content">
        <span className="home-hero-kicker"><Sparkles size={16} /> TRIPGENIE / MIỀN BẮC VIỆT NAM</span>
        <h1 id="hero-heading"><span>Đi để thấy.</span><em>Về để nhớ.</em></h1>
        <p>Những hành trình đáng nhớ bắt đầu từ một kế hoạch rõ ràng.<br />Chọn điểm đến, khám phá lịch trình và nhìn trước từng khoản chi.</p>
        <div className="home-search-area">
          <form className="home-destination-search" onSubmit={submitDestinationSearch} noValidate>
            <Search className="home-search-leading" size={25} aria-hidden="true" />
            <input
              type="search"
              value={destinationQuery}
              onChange={(event) => { setDestinationQuery(event.target.value); setSearchError('') }}
              onKeyDown={(event) => { if (event.key === 'Escape') event.currentTarget.blur() }}
              placeholder="Bạn muốn đi đâu?"
              aria-label="Tìm kiếm điểm đến miền Bắc"
              aria-describedby={searchError ? 'home-search-error' : undefined}
              autoComplete="off"
            />
            <button type="submit" aria-label="Tìm kiếm điểm đến"><Search size={26} /></button>
          </form>
          {normalizedQuery && <div className="home-search-suggestions" aria-label="Điểm đến gợi ý">
            {searchResults.length > 0 ? searchResults.map((destination) => <button
              type="button"
              key={destination.city}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseSearchResult(destination.city)}
            ><span><MapPin size={15} /></span><strong>{destination.city}</strong><small>{destination.meta}</small><ArrowUpRight size={15} /></button>)
              : <p>Chưa có điểm đến phù hợp. Hãy thử Hà Nội, Sa Pa hoặc Hạ Long.</p>}
          </div>}
        </div>
        {searchError && <p className="home-search-error" id="home-search-error" role="alert">{searchError}</p>}
        <a className="home-explore-link" href="#explore">Khám phá miền Bắc <ArrowRight size={18} /></a>
      </div>
    </section>

    <section className="home-explore home-section home-reveal" id="explore" aria-labelledby="explore-heading">
      <div className="home-section-heading">
        <span className="home-section-label">01 / KHÁM PHÁ</span>
        <div><h2 id="explore-heading">Một miền Bắc.<br /><em>Muôn cách để đi.</em></h2><p>Năm vùng đất đang chờ bạn khám phá. Chọn một điểm đến để xem cảm hứng, rồi biến nó thành chuyến đi của riêng mình.</p></div>
      </div>
      <div className="explore-editorial">
        <div className="explore-list" role="tablist" aria-label="Điểm đến miền Bắc">
          {northernDestinations.map((destination, index) => <button
            type="button" role="tab" aria-selected={activeDestination === destination.city} aria-controls="explore-panel"
            className={activeDestination === destination.city ? 'active' : ''}
            onClick={() => chooseExploreDestination(destination.city)} key={destination.city}
          ><span>{String(index + 1).padStart(2, '0')}</span><strong>{destination.city}</strong><ArrowUpRight size={19} /></button>)}
          <p>Mộc Châu và Cao Bằng sẽ được bổ sung khi có dữ liệu lịch trình và chi phí phù hợp.</p>
        </div>
        <div
          className={`explore-stage${exploreFlipped ? ' is-flipped' : ''}`}
          id="explore-panel"
          role="tabpanel"
          aria-label={active.city}
          ref={exploreStageRef}
          onPointerEnter={(event) => {
            if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
            exploreHoverRef.current = true
            setExploreFlipped(true)
          }}
          onPointerLeave={(event) => {
            if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
            exploreHoverRef.current = false
            if (!exploreStageRef.current?.contains(document.activeElement)) setExploreFlipped(false)
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget) && !exploreHoverRef.current) setExploreFlipped(false)
          }}
        >
          <div className="explore-flip-card">
            <div className="explore-stage-front" aria-hidden={exploreFlipped} onClick={openExploreDetails}>
              <img
                key={active.city}
                src={destinationImages[active.city]}
                srcSet={activeImageSet ? `${activeImageSet.small} 800w, ${activeImageSet.large} 1600w` : undefined}
                sizes="(max-width: 760px) 100vw, 64vw"
                width="1600"
                height="1067"
                alt={'Phong cảnh ' + active.city}
                loading="lazy"
                decoding="async"
              />
              <div className="explore-stage-overlay" />
              <span className="explore-stage-hint"><RotateCcw size={14} /> Rê chuột hoặc chạm để lật</span>
              <span className="explore-stage-index">{String(northernDestinations.indexOf(active) + 1).padStart(2, '0')} / 05</span>
              <div className="explore-stage-copy">
                <span>EXPLORE NORTHERN VIETNAM</span>
                <h3>{active.city}</h3>
                <p>{active.meta}</p>
                <button type="button" ref={exploreOpenRef} tabIndex={exploreFlipped ? -1 : 0} onClick={(event) => { event.stopPropagation(); openExploreDetails() }}>Xem nhanh địa danh <ArrowRight size={17} /></button>
              </div>
            </div>
            <div className="explore-stage-back" aria-hidden={!exploreFlipped}>
              <div className="explore-back-top"><span>KHÁM PHÁ NHANH / {String(northernDestinations.indexOf(active) + 1).padStart(2, '0')}</span><button type="button" ref={exploreCloseRef} tabIndex={exploreFlipped ? 0 : -1} onClick={closeExploreDetails}>Xem ảnh <RotateCcw size={15} /></button></div>
              <div className="explore-back-content">
                <h3>{active.city}</h3>
                <p>{destinationQuickNotes[active.city]}</p>
                <div className="explore-back-facts"><span><CalendarDays size={16} /> Từ {active.minDays} ngày</span><span><MapPin size={16} /> {active.meta}</span></div>
                <div className="explore-back-highlights"><strong>ĐIỂM DỪNG GỢI Ý</strong><ul>{active.activities.slice(0, 3).map((activity) => <li key={activity.title}>{activity.title}</li>)}</ul></div>
              </div>
              <div className="explore-back-actions"><button type="button" tabIndex={exploreFlipped ? 0 : -1} onClick={() => onExplore(active.city)}>Tìm hiểu địa điểm <ArrowUpRight size={17} /></button><button type="button" tabIndex={exploreFlipped ? 0 : -1} onClick={() => selectDestination(active.city)}>Lên kế hoạch <ArrowRight size={17} /></button></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="home-compare home-section home-reveal" aria-labelledby="compare-heading">
      <div className="home-section-heading">
        <span className="home-section-label">02 / CHỌN ĐIỂM ĐẾN</span>
        <div><h2 id="compare-heading">Ba ngày rảnh.<br /><em>Đi đâu cho hợp?</em></h2><p>Đặt năm điểm đến cạnh nhau để chọn theo thời gian và chi phí. Các con số được tính từ cùng một lịch trình mẫu, giúp bạn có điểm bắt đầu trước khi tự lên kế hoạch.</p></div>
      </div>
      <div className="compare-board">
        <div className="compare-board-head"><span>ĐIỂM ĐẾN</span><span>THỜI GIAN TỐI THIỂU</span><span>CHI PHÍ THAM KHẢO</span><span aria-hidden="true" /></div>
        {destinationComparisons.map(({ destination, estimate }, index) => <div className="compare-row" key={destination.city}>
          <div className="compare-place"><span>{String(index + 1).padStart(2, '0')}</span><strong>{destination.city}</strong><small>{destination.meta}</small></div>
          <div className="compare-days"><CalendarDays size={17} /><span>Từ {destination.minDays} ngày</span></div>
          <div className="compare-price"><strong>{formatVnd(estimate)}</strong><small>/ người · 3 ngày</small></div>
          <button type="button" onClick={() => onExplore(destination.city)} aria-label={`Khám phá ${destination.city}`}><ArrowUpRight size={19} /></button>
        </div>)}
      </div>
      <p className="compare-note">Ước tính cho 1 người, xuất phát từ Hà Nội, phong cách cân bằng trong 3 ngày; gồm di chuyển, lưu trú, ăn uống và hoạt động. Chi phí thực tế có thể thay đổi.</p>
    </section>

    <section className="home-preview home-section home-reveal" aria-labelledby="preview-heading">
      <div className="preview-intro"><span className="home-section-label">03 / LỊCH TRÌNH MẪU</span><h2 id="preview-heading">Từ ý tưởng<br /><em>đến từng ngày đi.</em></h2><p>Thử xem một chuyến Ninh Bình 3 ngày được sắp xếp ra sao. Bạn có thể tham khảo các điểm dừng và khoản chi trước khi tạo chuyến đi của mình.</p><div className="preview-facts"><span><MapPin size={16} /> Ninh Bình</span><span><CalendarDays size={16} /> 3 ngày</span><span><Users size={16} /> 2 người</span></div></div>
      <div className="preview-content">
        <div className="preview-days">{samplePlan.days.map((day) => <article className="preview-day" key={day.day}>
          <div className="preview-day-title"><span>NGÀY {String(day.day).padStart(2, '0')}</span><strong>{day.label}</strong></div>
          <ol>{day.activities.filter((activity) => activity.category === 'Hoạt động').map((activity) => <li key={activity.id}><time>{activity.time}</time><span>{activity.title}</span></li>)}</ol>
        </article>)}</div>
        <div className="preview-summary"><div><span>CHI PHÍ DỰ KIẾN · CẢ NHÓM</span><strong>{formatVnd(sampleSummary.planned)}</strong><small>Tham khảo cho 2 người / 3 ngày, xuất phát từ Hà Nội</small></div><button type="button" onClick={() => selectDestination('Ninh Bình')}>Tạo lịch trình của bạn <ArrowRight size={18} /></button></div>
      </div>
      <p className="preview-note">Lịch trình mẫu được tạo từ dữ liệu điểm đến và mức giá ước tính; chưa kiểm tra tình trạng dịch vụ theo ngày đi.</p>
    </section>

    <section className="home-news home-section home-reveal" aria-labelledby="news-heading">
      <div className="news-heading">
        <div><span className="home-section-label">04 / TIN TỨC & CẢM HỨNG</span><h2 id="news-heading">Chuyện đang diễn ra.<br /><em>Ý tưởng cho chuyến tới.</em></h2></div>
        <div className="news-heading-copy"><p>Tin tức, trải nghiệm và gợi ý mới nhất dành cho người yêu dịch chuyển.</p><a href="https://vnexpress.net/du-lich" target="_blank" rel="noreferrer">Xem nguồn VnExpress <ExternalLink size={15} /></a></div>
      </div>
      {travelNews.loading ? <div className="news-grid" aria-label="Đang tải tin du lịch">{[0, 1, 2].map((item) => <div className="news-card news-skeleton" key={item}><span /><div><i /><i /><i /></div></div>)}</div>
        : travelNews.error ? <div className="news-error"><Newspaper size={28} /><div><strong>Chưa tải được tin du lịch</strong><p>{travelNews.error}</p></div><a href="https://vnexpress.net/du-lich" target="_blank" rel="noreferrer">Đọc trực tiếp <ArrowUpRight size={16} /></a></div>
          : <div className="news-grid">{travelNews.articles.map((article) => <article className="news-card" key={article.id}>
            <a className="news-card-image" href={article.url} target="_blank" rel="noreferrer" aria-label={`Đọc bài: ${article.title}`}>
              {article.image ? <img src={article.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span><Newspaper size={30} /></span>}
            </a>
            <div className="news-card-body"><div className="news-meta"><span>{article.source}</span><time dateTime={article.publishedAt || undefined}><Clock size={13} /> {formatNewsDate(article.publishedAt)}</time></div><h3><a href={article.url} target="_blank" rel="noreferrer">{article.title}</a></h3><p>{article.description}</p><a className="news-read-more" href={article.url} target="_blank" rel="noreferrer">Đọc bài viết <ArrowUpRight size={15} /></a></div>
          </article>)}</div>}
      <p className="news-attribution">Nội dung được tổng hợp từ RSS chính thức của VnExpress Du lịch. Bản quyền bài viết thuộc về đơn vị xuất bản.</p>
    </section>

    <section className="home-planner home-section home-reveal" id="lap-ke-hoach" aria-labelledby="planner-heading">
      <div className="home-planner-intro"><span className="home-section-label">05 / LẬP KẾ HOẠCH</span><h2 id="planner-heading">Chuyến đi tiếp theo<br /><em>bắt đầu ở đây.</em></h2><p>Cho TripGenie biết điều bạn muốn. Bạn sẽ được tiếp tục tinh chỉnh sở thích, lịch trình và ngân sách ở bước kế tiếp.</p><span className="planner-orbit" aria-hidden="true"><Compass size={72} strokeWidth={.7} /></span></div>
      <form className="home-command-form" onSubmit={(event) => { event.preventDefault(); goTo('create') }}>
        <div className="command-title"><Sparkles size={20} /><div><strong>Thiết kế hành trình</strong><small>Lịch trình và chi phí ước tính — không phải báo giá đặt chỗ</small></div></div>
        <div className="command-fields">
          <label><span><Compass size={15} /> Bạn xuất phát từ đâu?</span><select value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })}>{departurePointNames.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label><span><MapPin size={15} /> Bạn muốn đến đâu?</span><select value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })}>{destinationNames.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label><span><CalendarDays size={15} /> Khởi hành khi nào?</span><input type="date" value={form.startDate} onChange={(event) => changeStartDate(event.target.value)} /></label>
          <label><span><Users size={15} /> Đi cùng ai?</span><select value={form.travelWith} onChange={(event) => setTravelWith(event.target.value)}><option>Cặp đôi</option><option>Một mình</option><option>Bạn bè</option><option>Gia đình</option></select></label>
          <label><span><Users size={15} /> Số người</span><input type="number" min="1" max="10" value={form.travelers} onChange={(event) => setForm({ ...form, travelers: Number(event.target.value) })} /></label>
          <label className="command-budget"><span><WalletCards size={15} /> Ngân sách cả nhóm (VNĐ)</span><input type="number" min="1" step="any" value={form.budget} onChange={(event) => setForm({ ...form, budget: Number(event.target.value) })} /></label>
        </div>
        <button className="command-submit" type="submit">Tiếp tục tạo kế hoạch <ArrowUpRight size={19} /></button>
      </form>
    </section>

    <section className="home-trust home-section home-reveal" aria-labelledby="trust-heading">
      <div className="trust-heading"><div><span className="home-section-label"><ShieldCheck size={15} /> 06 / NGUỒN DỮ LIỆU MINH BẠCH</span><h2 id="trust-heading">Gợi ý có nguồn.<br /><em>Quyết định vẫn là của bạn.</em></h2></div><p>TripGenie kết hợp dữ liệu mở với AI để tạo gợi ý tham khảo. Giá, thời tiết và khả năng cung cấp dịch vụ có thể thay đổi trước ngày đi.</p></div>
      <div className="trust-provider-grid">
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer"><CloudSun size={22} /><span><strong>Open‑Meteo</strong><small>Dự báo thời tiết</small></span><ArrowUpRight size={14} /></a>
        <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer"><Map size={22} /><span><strong>OpenStreetMap</strong><small>Địa điểm và bản đồ</small></span><ArrowUpRight size={14} /></a>
        <a href="https://project-osrm.org/" target="_blank" rel="noreferrer"><Route size={22} /><span><strong>OSRM</strong><small>Tuyến đường tham khảo</small></span><ArrowUpRight size={14} /></a>
        <a href="https://ai.google.dev/gemini-api" target="_blank" rel="noreferrer"><Sparkles size={22} /><span><strong>Gemini AI</strong><small>Cá nhân hóa lịch trình</small></span><ArrowUpRight size={14} /></a>
      </div>
      <p className="trust-disclaimer"><ShieldCheck size={14} /> TripGenie không bán vé hoặc phòng; mọi chi phí hiển thị là ước tính để lập kế hoạch.</p>
    </section>

  </main>
}
