import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Compass, MapPin, Sparkles, Users, WalletCards } from 'lucide-react'
import TravelScene from '../3d/TravelScene'
import DestinationCard from '../DestinationCard'
import { destinationImages } from '../../data/destinationImages'
import { destinationNames, northernDestinations } from '../../data/northernDestinations'
import { addDays, countTripDays, createDefaultForm, generatePlan, summarizePlan } from '../../lib/tripPlanner'

const destinationEstimates = Object.fromEntries(northernDestinations.map((destination) => {
  const sample = createDefaultForm()
  sample.destination = destination.city
  sample.endDate = addDays(sample.startDate, destination.minDays - 1)
  sample.travelers = 1
  sample.travelWith = 'Một mình'
  sample.budget = 10000000
  return [destination.city, summarizePlan(generatePlan(sample)).planned]
}))

const featured = ['Sa Pa', 'Hạ Long', 'Hà Giang'].map((city) => northernDestinations.find((destination) => destination.city === city))

export default function HomePage({ goTo, form, setForm }) {
  const [activeDestination, setActiveDestination] = useState('Ninh Bình')
  const active = northernDestinations.find((destination) => destination.city === activeDestination) || northernDestinations[0]

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

  return <main className="immersive-home">
    <section className="home-hero" aria-labelledby="hero-heading">
      <TravelScene destinations={northernDestinations} activeDestination={activeDestination} onHover={setActiveDestination} onSelect={selectDestination} />
      <div className="home-hero-haze" aria-hidden="true" />
      <div className="home-hero-content">
        <span className="home-hero-kicker"><Sparkles size={16} /> TRIPGENIE / MIỀN BẮC VIỆT NAM</span>
        <h1 id="hero-heading"><span>Đi để thấy.</span><em>Về để nhớ.</em></h1>
        <p>Những hành trình đáng nhớ bắt đầu từ một kế hoạch rõ ràng. Chọn điểm đến, khám phá lịch trình và nhìn trước từng khoản chi.</p>
        <div className="home-hero-actions">
          <button type="button" className="home-hero-primary" onClick={() => goTo('create')}>Thiết kế chuyến đi <ArrowUpRight size={19} /></button>
          <a href="#explore">Khám phá miền Bắc <ArrowRight size={18} /></a>
        </div>
      </div>
      <div className="home-hero-index"><span>21°02′ BẮC</span><span>5 ĐIỂM ĐẾN ĐANG HỖ TRỢ</span></div>
      <a className="home-scroll-cue" href="#explore" aria-label="Cuộn xuống khám phá điểm đến"><ArrowDown size={16} /> CUỘN ĐỂ KHÁM PHÁ</a>
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
            onClick={() => setActiveDestination(destination.city)} key={destination.city}
          ><span>{String(index + 1).padStart(2, '0')}</span><strong>{destination.city}</strong><ArrowUpRight size={19} /></button>)}
          <p>Mộc Châu và Cao Bằng sẽ được bổ sung khi có dữ liệu lịch trình và chi phí phù hợp.</p>
        </div>
        <div className="explore-stage" id="explore-panel" role="tabpanel" aria-label={active.city}>
          <img key={active.city} src={destinationImages[active.city]} alt={'Phong cảnh ' + active.city} loading="lazy" />
          <div className="explore-stage-overlay" />
          <span className="explore-stage-index">{String(northernDestinations.indexOf(active) + 1).padStart(2, '0')} / 05</span>
          <div className="explore-stage-copy">
            <span>EXPLORE NORTHERN VIETNAM</span>
            <h3>{active.city}</h3>
            <p>{active.meta}</p>
            <div><a href={active.guideUrl} target="_blank" rel="noreferrer">Tìm hiểu địa điểm <ArrowUpRight size={17} /></a><button type="button" onClick={() => selectDestination(active.city)}>Lên kế hoạch <ArrowRight size={17} /></button></div>
          </div>
        </div>
      </div>
    </section>

    <section className="home-featured home-section home-reveal" aria-labelledby="featured-heading">
      <div className="featured-heading"><div><span className="home-section-label">02 / ĐIỂM ĐẾN NỔI BẬT</span><h2 id="featured-heading">Đi xa hơn <em>một chút.</em></h2></div><p>Chọn hành trình theo cảnh sắc bạn yêu. Chi phí bên dưới được tính từ dữ liệu ước tính hiện có của TripGenie.</p></div>
      <div className="feature-gallery">
        {featured.map((destination, index) => <DestinationCard key={destination.city} destination={destination} index={index} estimate={destinationEstimates[destination.city]} onPlan={selectDestination} onPreview={setActiveDestination} />)}
      </div>
      <p className="destination-estimate-note">* Chi phí mẫu theo phong cách cân bằng, 1 người, khởi hành từ Hà Nội; chưa tính dự phòng. Giá thực tế có thể thay đổi.</p>
    </section>

    <section className="home-planner home-section home-reveal" id="lap-ke-hoach" aria-labelledby="planner-heading">
      <div className="home-planner-intro"><span className="home-section-label">03 / LẬP KẾ HOẠCH</span><h2 id="planner-heading">Chuyến đi tiếp theo<br /><em>bắt đầu ở đây.</em></h2><p>Cho TripGenie biết điều bạn muốn. Bạn sẽ được tiếp tục tinh chỉnh sở thích, lịch trình và ngân sách ở bước kế tiếp.</p><span className="planner-orbit" aria-hidden="true"><Compass size={72} strokeWidth={.7} /></span></div>
      <form className="home-command-form" onSubmit={(event) => { event.preventDefault(); goTo('create') }}>
        <div className="command-title"><Sparkles size={20} /><div><strong>Thiết kế hành trình</strong><small>Lịch trình và chi phí ước tính — không phải báo giá đặt chỗ</small></div></div>
        <div className="command-fields">
          <label><span><MapPin size={15} /> Bạn muốn đến đâu?</span><select value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })}>{destinationNames.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label><span><CalendarDays size={15} /> Khởi hành khi nào?</span><input type="date" value={form.startDate} onChange={(event) => changeStartDate(event.target.value)} /></label>
          <label><span><Users size={15} /> Đi cùng ai?</span><select value={form.travelWith} onChange={(event) => setTravelWith(event.target.value)}><option>Cặp đôi</option><option>Một mình</option><option>Bạn bè</option><option>Gia đình</option></select></label>
          <label><span><Users size={15} /> Số người</span><input type="number" min="1" max="10" value={form.travelers} onChange={(event) => setForm({ ...form, travelers: Number(event.target.value) })} /></label>
          <label className="command-budget"><span><WalletCards size={15} /> Ngân sách cả nhóm (VNĐ)</span><input type="number" min="1" step="any" value={form.budget} onChange={(event) => setForm({ ...form, budget: Number(event.target.value) })} /></label>
        </div>
        <button className="command-submit" type="submit">Tiếp tục tạo kế hoạch <ArrowUpRight size={19} /></button>
      </form>
    </section>

    <section className="home-how home-section home-reveal" aria-labelledby="how-heading">
      <div className="home-section-heading"><span className="home-section-label">04 / CÁCH TRIPGENIE HOẠT ĐỘNG</span><div><h2 id="how-heading">Tự do khám phá.<br /><em>Rõ ràng từng bước.</em></h2><p>Một công cụ vừa đủ để ý tưởng du lịch thành lịch trình có thể chỉnh sửa và lưu lại.</p></div></div>
      <div className="home-how-steps">
        <div><span>01</span><MapPin size={24} /><h3>Chọn nơi đến</h3><p>Điểm đến, thời gian, số người và cách bạn muốn trải nghiệm.</p></div>
        <div><span>02</span><CalendarDays size={24} /><h3>Tạo lịch trình</h3><p>Xem hoạt động theo từng ngày và chỉnh thời gian, nội dung theo ý mình.</p></div>
        <div><span>03</span><WalletCards size={24} /><h3>Kiểm tra chi phí</h3><p>Đối chiếu ngân sách, cập nhật khoản chi và lưu chuyến đi vào tài khoản.</p></div>
      </div>
    </section>

    <section className="home-inspiration home-reveal" aria-labelledby="inspiration-heading"><div><span className="home-section-label">05 / CẢM HỨNG LÊN ĐƯỜNG</span><h2 id="inspiration-heading">Có những nơi<br />chỉ cần nghĩ tới<br /><em>là muốn đi.</em></h2><p>Từ phố cổ Hà Nội đến vùng núi Sa Pa, hãy để chuyến đi tiếp theo bắt đầu bằng một lựa chọn nhỏ.</p><button type="button" onClick={() => goTo('create')}>Lên lịch trình của tôi <ArrowUpRight size={18} /></button></div></section>
    <section className="home-final-cta home-reveal"><span>TRIPGENIE / NORTHERN VIETNAM</span><h2>Hành trình của bạn<br /><em>đang chờ phía trước.</em></h2><button type="button" onClick={() => goTo('create')}>Bắt đầu lên kế hoạch <ArrowRight size={19} /></button></section>
  </main>
}
