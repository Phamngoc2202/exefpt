// The persistent Three.js world continues behind this viewport-height chapter.
export default function JourneyGlobe() {
  return <section id="journey" className="journey-globe" aria-label="Từ thế giới 3D đến miền Bắc">
    <div className="journey-globe-stage">
      <div className="journey-globe-opening">
        <span>TRIPGENIE / HÀNH TRÌNH MIỀN BẮC</span>
        <p>Một thế giới.<br /><em>Muôn cách để đi.</em></p>
      </div>
      <div className="journey-globe-arrival">
        <span>CUỘN ĐỂ KHÁM PHÁ</span>
        <p>Từ thế giới nhỏ đến chân trời rộng.</p>
      </div>
      <span className="journey-globe-axis" aria-hidden="true">KHÁM PHÁ MIỀN BẮC <span>↓</span></span>
    </div>
  </section>
}
