import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function WeeklyActivity({ days, total, won, demo = false }: { days: { day: string; total: number }[]; total: number; won: number; demo?: boolean }) {
  const max = Math.max(1, ...days.map(day => day.total));
  return <section className="weekly-activity" aria-label="Seven-day enquiry activity">
    <header><div><p className="eyebrow">{demo ? "Sample week" : "Last 7 days · UTC"}</p><h2>Enquiry activity</h2></div>{!demo && <Link className="text-link" href={`/reports?from=${days[0]?.day ?? ""}&to=${days.at(-1)?.day ?? ""}`}>Reports <ArrowUpRight size={15} /></Link>}</header>
    <div className="activity-total"><strong>{total.toLocaleString()}</strong><span>enquiries received</span><span className="activity-won">{won.toLocaleString()} won</span></div>
    <ol className="weekly-bars">{days.map(({ day, total: count }) => <li key={day}><span className="weekly-bar-value">{count}</span><div className="weekly-bar-track"><i style={{ height: `${count / max * 100}%` }} /></div><span>{new Date(`${day}T00:00:00Z`).toLocaleDateString("en", { weekday: "short", timeZone: "UTC" })}</span><span className="sr-only">{day}: {count} enquiries</span></li>)}</ol>
  </section>;
}
