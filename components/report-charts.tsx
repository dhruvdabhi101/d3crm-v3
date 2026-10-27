import type { CSSProperties } from "react";
import { ARRIVAL_SLOTS, WEEKDAYS, type ResponseCohort } from "@/lib/reports";

const dayLabel = (day: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en", { ...options, timeZone: "UTC" });

const percent = (part: number, whole: number) => whole ? Math.round(part * 100 / whole) : 0;

/** Five intensity steps; 0 means nothing to show. */
const level = (value: number, max: number) => value && max ? Math.max(1, Math.ceil(value / max * 4)) : 0;

/** Daily enquiries as columns. Today's column is dotted because the day isn't over yet. */
export function TrendChart({ days, today }: { days: { day: string; total: number }[]; today: string }) {
  const peak = Math.max(1, ...days.map(day => day.total));
  const max = peak < 4 ? peak : Math.ceil(peak / 2) * 2;
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const busiest = days.reduce((best, day) => day.total > best.total ? day : best, days[0]);
  const ticks = days.length > 1 ? [days[0], days[Math.floor((days.length - 1) / 2)], days[days.length - 1]] : days;
  const summary = `${total} enquiries between ${dayLabel(days[0].day)} and ${dayLabel(days[days.length - 1].day)}.${busiest?.total ? ` Busiest day: ${dayLabel(busiest.day)} with ${busiest.total}.` : ""}`;
  return (
    <figure className="trend-chart">
      <div className="trend-plot">
        <div className="trend-scale" aria-hidden="true">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <ol
          className="trend-bars"
          role="img"
          aria-label={summary}
          data-dense={days.length > 62 ? "" : undefined}
          style={{ "--trend-count": days.length } as CSSProperties}
        >
          {days.map(day => (
            <li
              key={day.day}
              data-partial={day.day === today ? "" : undefined}
            >
              <i style={{ height: `${day.total / max * 100}%` }} />
              <span className="trend-tip">
                <strong>{day.total}</strong> {dayLabel(day.day, { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="trend-axis" aria-hidden="true">
        {ticks.map(day => <span key={day.day}>{dayLabel(day.day)}</span>)}
      </div>
      {days.some(day => day.day === today) && (
        <figcaption className="chart-key">
          <i className="chart-swatch" data-partial="" aria-hidden="true" />
          Today, still counting
        </figcaption>
      )}
    </figure>
  );
}

const pipelineStages = [
  { key: "new", label: "New" },
  { key: "inContact", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

/** Where every enquiry in the period stands now, as one stacked bar. */
export function PipelineBar({ counts }: { counts: Record<(typeof pipelineStages)[number]["key"], number> }) {
  const total = pipelineStages.reduce((sum, stage) => sum + counts[stage.key], 0);
  return (
    <div className="pipeline-chart">
      <div className="pipeline-track" aria-hidden="true">
        {pipelineStages.map(stage => counts[stage.key] > 0 && (
          <i
            key={stage.key}
            data-stage={stage.key}
            style={{ flexGrow: counts[stage.key] }}
          />
        ))}
      </div>
      <dl className="pipeline-legend">
        {pipelineStages.map(stage => (
          <div key={stage.key}>
            <dt>
              <i className="chart-swatch" data-stage={stage.key} aria-hidden="true" />
              {stage.label}
            </dt>
            <dd>
              <strong>{counts[stage.key].toLocaleString()}</strong>
              <span>{percent(counts[stage.key], total)}%</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const cohortColumns = [
  { key: "withinHour", label: "Within 1 hr" },
  { key: "withinDay", label: "Within 24 hr" },
  { key: "reached", label: "Ever" },
  { key: "won", label: "Won" },
] as const;

/** Weekly cohorts: of the enquiries that arrived each week, the share you reached and won. */
export function ResponseCohorts({ cohorts }: { cohorts: ResponseCohort[] }) {
  return (
    <div className="cohort-scroll">
      <table className="cohort-table">
        <caption className="sr-only">Share of each week&apos;s enquiries contacted within 1 hour, within 24 hours, ever, and won</caption>
        <colgroup>
          <col />
          <col />
          {cohortColumns.map(column => <col key={column.key} />)}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Week of</th>
            <th scope="col"><abbr title="Enquiries">Total</abbr></th>
            {cohortColumns.map(column => <th key={column.key} scope="col">{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {cohorts.map(cohort => (
            <tr key={cohort.week}>
              <th scope="row">{dayLabel(cohort.week)}</th>
              <td className="cohort-count">{cohort.total}</td>
              {cohortColumns.map(column => {
                const share = percent(cohort[column.key], cohort.total);
                return (
                  <td
                    key={column.key}
                    className="cohort-cell"
                    data-level={level(share, 100)}
                    title={`${cohort[column.key]} of ${cohort.total}`}
                  >
                    {share}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** When enquiries arrive: weekday by three-hour UTC slot. */
export function ArrivalHeatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(0, ...grid.flat());
  return (
    <div className="cohort-scroll">
      <table className="arrival-table">
        <caption className="sr-only">Enquiries received by weekday and three-hour UTC time slot</caption>
        <thead>
          <tr>
            <td />
            {ARRIVAL_SLOTS.map(slot => <th key={slot} scope="col"><abbr title={`${slot} UTC`}>{slot.slice(0, 2)}</abbr></th>)}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, day) => (
            <tr key={WEEKDAYS[day]}>
              <th scope="row">{WEEKDAYS[day]}</th>
              {row.map((count, slot) => (
                <td
                  key={ARRIVAL_SLOTS[slot]}
                  data-level={level(count, max)}
                  title={`${WEEKDAYS[day]} ${ARRIVAL_SLOTS[slot]} UTC: ${count} ${count === 1 ? "enquiry" : "enquiries"}`}
                >
                  <span>{count || ""}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="arrival-note">Columns are three-hour blocks, starting at the hour shown (UTC).</p>
    </div>
  );
}

/** A ranked list with a proportional bar behind each row. */
export function RankedBars({ rows, empty }: { rows: { key: string; label: React.ReactNode; total: number; won: number }[]; empty: string }) {
  if (!rows.length) return <p className="report-empty">{empty}</p>;
  const max = Math.max(1, ...rows.map(row => row.total));
  return (
    <ol className="ranked-bars">
      {rows.map(row => (
        <li key={row.key}>
          <div className="ranked-label">{row.label}</div>
          <div className="ranked-values">
            <strong>{row.total.toLocaleString()}</strong>
            <span>{row.won ? `${row.won} won · ${percent(row.won, row.total)}%` : "0 won"}</span>
          </div>
          <div className="ranked-track" aria-hidden="true">
            <i style={{ width: `${row.total / max * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
