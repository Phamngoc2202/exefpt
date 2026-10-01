import { BusFront, CalendarDays, ExternalLink, ShieldCheck, Users } from 'lucide-react'
import { formatTripDate } from '../lib/tripPlanner'
import { buildTransportProviderLinks } from '../lib/transportProviders'

export default function TransportProviders({ form }) {
  if (!form?.origin || !form?.destination || form.origin === form.destination) return null

  const providers = buildTransportProviderLinks(form)

  return <section className="transport-provider-card">
    <div className="transport-provider-heading"><span><BusFront size={17} /></span><div><small>NHÀ CUNG CẤP BÊN NGOÀI</small><strong>Tìm vé xe phù hợp</strong></div></div>
    <div className="transport-route-summary">
      <strong>{form.origin} → {form.destination}</strong>
      <span><CalendarDays size={13} /> {formatTripDate(form.startDate)} · <Users size={13} /> {form.travelers} người</span>
    </div>
    <div className="transport-provider-list">
      {providers.map((provider) => <article key={provider.name}>
        <div><strong>{provider.name}</strong>{provider.exactRoute && <span><ShieldCheck size={11} /> Đã điền tuyến</span>}</div>
        <p>{provider.description}</p>
        <a href={provider.url} target="_blank" rel="noreferrer">{provider.action} <ExternalLink size={13} /></a>
      </article>)}
    </div>
    <p className="transport-provider-note">TripGenie không bán vé và không nhận thanh toán. Giá, lịch chạy và chỗ trống do nhà cung cấp cập nhật; hãy kiểm tra lại trước khi đặt.</p>
  </section>
}
