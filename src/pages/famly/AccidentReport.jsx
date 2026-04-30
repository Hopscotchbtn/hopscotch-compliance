import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { classifyAll, childDisplayName, formatDate } from '../../lib/famly/dataHelpers'
import { computeAccidentReport } from '../../lib/famly/computeAccidentReport'
import { generateMonthlyReportPDF } from '../../lib/famly/generateMonthlyReportPDF'

const FOREST = '#1f4435'
const FOREST_T1 = '#e8ecea'
const FOREST_T3 = '#4c695d'
const PEBBLE = '#f2eeed'
const PEBBLE_T2 = '#fbfaf9'
const PEBBLE_SHADE = '#d7ccca'
const MARMALADE = '#fd884a'
const MARMALADE_T1 = '#fff3ec'
const MARMALADE_SHADE = '#fa541f'
const SUNSHINE_T2 = '#fdfacc'
const APPLE = '#6d9f6b'

function ymKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function buildPeriod(type, monthKey) {
  const now = new Date()
  if (type === 'month') {
    const [y, m] = monthKey.split('-').map(Number)
    const from = new Date(y, m - 1, 1)
    const to = new Date(y, m, 0, 23, 59, 59, 999)
    return { type: 'month', from, to, label: monthLabel(monthKey), monthKey }
  }
  if (type === 'ytd') {
    const from = new Date(now.getFullYear(), 0, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const firstLabel = from.toLocaleDateString('en-GB', { month: 'short' })
    const lastLabel = to.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    return { type: 'ytd', from, to, label: `${firstLabel} – ${lastLabel}` }
  }
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const from = new Date(to.getFullYear(), to.getMonth() - 11, 1)
  const fromLabel = from.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const toLabel = to.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  return { type: '12month', from, to, label: `${fromLabel} – ${toLabel}` }
}

function fetchRangeForPeriod(period) {
  if (period.type === 'month') {
    const from = new Date(period.from.getFullYear() - 1, period.from.getMonth(), 1)
    return { from, to: period.to }
  }
  return { from: period.from, to: period.to }
}

function titleForPeriod(period) {
  if (period.type === 'ytd') return 'Year-to-Date Accident Review'
  if (period.type === '12month') return '12-Month Accident Review'
  return 'Monthly Accident Review'
}

export function AccidentReport() {
  const [searchParams] = useSearchParams()
  const siteId = searchParams.get('site') ?? ''
  const type = searchParams.get('type') ?? 'month'
  const monthKey = searchParams.get('month') ?? ymKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1))

  const [siteName, setSiteName] = useState('Site')
  const [incidents, setIncidents] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const period = useMemo(() => buildPeriod(type, monthKey), [type, monthKey])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)

        const sitesRes = await fetch('/api/famly-sites')
        if (!sitesRes.ok) throw new Error('Failed to load sites')
        const sites = await sitesRes.json()
        const site = sites.find(s => s.id === siteId)
        if (cancelled) return
        if (site) setSiteName(site.name)

        const range = fetchRangeForPeriod(period)
        const fromStr = range.from.toISOString().slice(0, 10)
        const toStr = range.to.toISOString().slice(0, 10)
        const res = await fetch(`/api/famly-incidents?siteId=${siteId}&from=${fromStr}&to=${toStr}`)
        if (!res.ok) throw new Error('Failed to load incidents')
        const raw = await res.json()
        if (cancelled) return
        setIncidents(classifyAll(raw))
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load report')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (siteId) load()
    else {
      setError('Missing site in URL')
      setLoading(false)
    }
    return () => { cancelled = true }
  }, [siteId, period])

  const report = useMemo(() => {
    if (!incidents) return null
    return computeAccidentReport(incidents, period)
  }, [incidents, period])

  const handleDownload = useCallback(() => {
    if (!report) return
    generateMonthlyReportPDF(report, siteName)
  }, [report, siteName])

  const handlePrint = useCallback(() => { window.print() }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: PEBBLE }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .report-page { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; }
        }
      `}</style>

      {/* Action bar */}
      <div
        className="no-print border-b sticky top-0 z-10"
        style={{ backgroundColor: '#fff', borderColor: PEBBLE_SHADE }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            to={`/famly-dashboard?site=${siteId}&type=${type}&month=${monthKey}`}
            className="text-sm"
            style={{ color: FOREST_T3 }}
          >
            ← Back
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!report}
              className="text-sm font-medium px-3 py-2 rounded-md border disabled:opacity-50"
              style={{ borderColor: PEBBLE_SHADE, color: FOREST, backgroundColor: '#fff' }}
            >
              Print
            </button>
            <button
              onClick={handleDownload}
              disabled={!report}
              className="text-sm font-semibold px-3 py-2 rounded-md text-white disabled:opacity-50"
              style={{ backgroundColor: MARMALADE }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = MARMALADE_SHADE)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = MARMALADE)}
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <div
            className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: MARMALADE, borderTopColor: 'transparent' }}
          />
          <p className="text-sm mt-3" style={{ color: FOREST_T3 }}>Loading report…</p>
        </div>
      ) : error ? (
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div
            className="border rounded-lg px-4 py-6 text-center"
            style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}
          >
            <p className="text-sm font-medium" style={{ color: '#991b1b' }}>Unable to load report</p>
            <p className="text-xs mt-1" style={{ color: '#b91c1c' }}>{error}</p>
          </div>
        </div>
      ) : report && (
        <main
          className="report-page max-w-3xl mx-auto my-6 px-6 py-8 shadow-sm border"
          style={{
            backgroundColor: '#fff',
            borderColor: PEBBLE_SHADE,
            fontFamily: "'Greycliffe CF', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            color: FOREST,
          }}
        >
          <div style={{ height: 4, backgroundColor: FOREST, marginBottom: 20, marginLeft: -24, marginRight: -24, marginTop: -32 }} />

          <header className="text-center mb-8">
            <h1
              className="text-2xl font-bold"
              style={{ color: FOREST, fontFamily: "'Ivar Display', Georgia, serif" }}
            >
              {titleForPeriod(period)}
            </h1>
            <p className="text-base mt-1" style={{ color: FOREST }}>{siteName}</p>
            <p className="text-sm mt-1" style={{ color: FOREST_T3 }}>{period.label}</p>
          </header>

          <KpiStrip report={report} />

          <RegulatoryFlagsBar report={report} />

          <FormalReviewSection report={report} />

          <RepeatChildrenSection report={report} />

          <InjuryTypeSection report={report} />

          <LocationSection report={report} />

          <DayOfWeekSection report={report} />

          <OutdoorSection report={report} />

          <HomeOnArrivalSection report={report} />

          <ReviewedBySection />

          <footer className="mt-8 pt-4 border-t flex items-center justify-between text-xs" style={{ borderColor: PEBBLE_SHADE, color: FOREST_T3 }}>
            <span>For internal management review only. Not a safeguarding record.</span>
            <span>Generated {new Date().toLocaleString('en-GB')}</span>
          </footer>
        </main>
      )}
    </div>
  )
}

// ─── sections ──

function KpiStrip({ report }) {
  const { totalReports, onArrival, atNursery, acknowledged, ackRate, high, medium, yoyDiff, period } = report

  const cards = [
    {
      label: 'Reports',
      value: String(totalReports),
      sub: yoyDiff != null
        ? yoyDiff === 0 ? 'same as last year' : yoyDiff > 0 ? `+${yoyDiff} vs last year` : `${yoyDiff} vs last year`
        : period.label,
    },
    {
      label: 'At nursery',
      value: String(atNursery),
      sub: onArrival > 0 ? `${onArrival} arrived with injury` : 'all occurred at nursery',
    },
    {
      label: 'Parent acknowledged',
      value: `${ackRate}%`,
      sub: `${acknowledged} of ${totalReports}`,
    },
    {
      label: 'Needs formal review',
      value: String(high.length + medium.length),
      sub: `${high.length} high · ${medium.length} medium`,
      warn: high.length + medium.length > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
      {cards.map((card, i) => (
        <div
          key={i}
          className="rounded-lg border p-3"
          style={{
            backgroundColor: card.warn ? '#fef2f2' : PEBBLE_T2,
            borderColor: card.warn ? '#fca5a5' : PEBBLE_SHADE,
          }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: FOREST_T3 }}>
            {card.label}
          </div>
          <div
            className="text-2xl font-bold mt-1"
            style={{ color: card.warn ? '#991b1b' : FOREST, fontFamily: "'Ivar Display', Georgia, serif" }}
          >
            {card.value}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: FOREST_T3 }}>{card.sub}</div>
        </div>
      ))}
    </div>
  )
}

function RegulatoryFlagsBar({ report }) {
  const { riddorCount, ofstedCount, ladoCount } = report
  if (riddorCount + ofstedCount + ladoCount === 0) return null
  const parts = []
  if (riddorCount > 0) parts.push(`RIDDOR: ${riddorCount}`)
  if (ofstedCount > 0) parts.push(`Ofsted: ${ofstedCount}`)
  if (ladoCount > 0) parts.push(`LADO: ${ladoCount}`)
  return (
    <div
      className="rounded-md border px-4 py-2.5 mb-6 text-sm font-semibold"
      style={{ backgroundColor: MARMALADE_T1, borderColor: MARMALADE, color: MARMALADE_SHADE }}
    >
      Regulatory flags &nbsp;—&nbsp; {parts.join('   ·   ')}
    </div>
  )
}

function FormalReviewSection({ report }) {
  const { high, medium } = report
  if (high.length === 0 && medium.length === 0) return null
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold" style={{ color: FOREST, fontFamily: "'Ivar Display', Georgia, serif" }}>
        Needs formal review
      </h2>
      <p className="text-xs mt-0.5 mb-3" style={{ color: FOREST_T3 }}>
        Auto-flagged by keyword match — please review each for context.
      </p>

      {high.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-bold" style={{ color: '#991b1b' }}>
            High priority · {high.length}
          </div>
          <ul className="mt-1 space-y-1 text-sm" style={{ color: FOREST }}>
            {high.map((inc, i) => (
              <li key={i}>
                • {childDisplayName(inc.childName)} · {formatDate(inc.happenedAt)} · {inc.injuryCategory} · {(inc.location || '').slice(0, 40)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {medium.length > 0 && (
        <div>
          <div className="text-sm font-bold" style={{ color: MARMALADE_SHADE }}>
            Medium priority · {medium.length}
          </div>
          <ul className="mt-1 space-y-1 text-sm" style={{ color: FOREST }}>
            {medium.map((inc, i) => (
              <li key={i}>
                • {childDisplayName(inc.childName)} · {formatDate(inc.happenedAt)} · {inc.injuryCategory} · {(inc.location || '').slice(0, 40)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function RepeatChildrenSection({ report }) {
  const { repeats, repeatWindowLabel } = report
  if (repeats.length === 0) return null
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold" style={{ color: FOREST, fontFamily: "'Ivar Display', Georgia, serif" }}>
        Top repeat children ({repeatWindowLabel})
      </h2>
      <p className="text-xs mt-0.5 mb-3" style={{ color: FOREST_T3 }}>
        Ranked by count. Context matters — some children may have medical or developmental factors.
      </p>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: `1px solid ${PEBBLE_SHADE}` }}>
            <th className="text-left py-1.5 pr-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>#</th>
            <th className="text-left py-1.5 pr-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Child</th>
            <th className="text-left py-1.5 pr-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Count</th>
            <th className="text-left py-1.5 pr-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Most recent</th>
            <th className="text-left py-1.5 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Last location</th>
          </tr>
        </thead>
        <tbody>
          {repeats.map((child, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${PEBBLE}` }}>
              <td className="py-1.5 pr-2" style={{ color: FOREST_T3 }}>{i + 1}</td>
              <td className="py-1.5 pr-2" style={{ color: FOREST }}>{child.displayName}</td>
              <td className="py-1.5 pr-2 font-semibold" style={{ color: FOREST }}>{child.count}</td>
              <td className="py-1.5 pr-2" style={{ color: FOREST }}>{formatDate(child.mostRecentDate)}</td>
              <td className="py-1.5" style={{ color: FOREST }}>{(child.mostRecentLocation || '').slice(0, 40)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function LocationSection({ report }) {
  const { homeLoc, siteLocs, totalReports } = report
  if (!homeLoc && siteLocs.length === 0) return null
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold mb-3" style={{ color: FOREST, fontFamily: "'Ivar Display', Georgia, serif" }}>
        Where reports happen
      </h2>

      {homeLoc && (
        <div
          className="rounded-md border p-3 mb-4"
          style={{ backgroundColor: SUNSHINE_T2, borderColor: MARMALADE }}
        >
          <div className="text-sm font-bold" style={{ color: MARMALADE_SHADE }}>
            Location field "Home": {homeLoc.count}
          </div>
          <p className="text-xs mt-1" style={{ color: FOREST_T3 }}>
            Managers are typing "Home" into the location field. This may be data entry inconsistency — compare with the
            "arrived with injury" number at the top. Consider standardising how these reports are recorded.
          </p>
        </div>
      )}

      {siteLocs.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>Top locations in the nursery</div>
          <ul className="space-y-1 text-sm">
            {siteLocs.map((loc, i) => {
              const pct = totalReports > 0 ? Math.round((loc.count / totalReports) * 100) : 0
              return (
                <li key={i} className="flex items-baseline justify-between" style={{ color: FOREST }}>
                  <span>• {loc.location}</span>
                  <span style={{ color: FOREST_T3 }}>{loc.count} ({pct}%)</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

function DayOfWeekSection({ report }) {
  const { dowOrder, dowCounts, totalReports } = report
  if (totalReports === 0) return null
  const dowMax = Math.max(1, ...Object.values(dowCounts))
  const rows = dowOrder.filter(d => {
    if (d === 'Saturday' || d === 'Sunday') return dowCounts[d] > 0
    return true
  })
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold mb-3" style={{ color: FOREST, fontFamily: "'Ivar Display', Georgia, serif" }}>
        When reports happen
      </h2>
      <div className="space-y-1.5">
        {rows.map(day => {
          const count = dowCounts[day]
          const pct = (count / dowMax) * 100
          return (
            <div key={day} className="flex items-center gap-3 text-sm">
              <div className="w-20" style={{ color: FOREST }}>{day}</div>
              <div className="flex-1 h-4 rounded" style={{ backgroundColor: PEBBLE }}>
                <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: FOREST_T1, border: `1px solid ${FOREST_T3}` }} />
              </div>
              <div className="w-8 text-right" style={{ color: FOREST_T3 }}>{count}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function InjuryTypeSection({ report }) {
  const { injuryTypes, totalReports } = report
  if (!injuryTypes || injuryTypes.length === 0) return null
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold mb-1" style={{ color: FOREST, fontFamily: "'Ivar Display', Georgia, serif" }}>
        Injury type breakdown
      </h2>
      <p className="text-xs mt-0.5 mb-3" style={{ color: FOREST_T3 }}>
        As a percentage of all reports in this period.
      </p>
      <ul className="space-y-1 text-sm">
        {injuryTypes.map(({ category, count }, i) => {
          const pct = totalReports > 0 ? Math.round((count / totalReports) * 100) : 0
          return (
            <li key={i} className="flex items-baseline justify-between" style={{ color: FOREST }}>
              <span>• {category}</span>
              <span style={{ color: FOREST_T3 }}>{count} ({pct}%)</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function TrendBars({ monthly, max }) {
  return (
    <div className="space-y-1.5">
      {monthly.map(m => {
        const pct = max > 0 ? (m.count / max) * 100 : 0
        return (
          <div key={m.yearMonth} className="flex items-center gap-3 text-sm">
            <div className="w-14 text-xs shrink-0" style={{ color: FOREST }}>{m.label}</div>
            <div className="flex-1 h-4 rounded" style={{ backgroundColor: PEBBLE }}>
              {m.count > 0 && (
                <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: FOREST_T1, border: `1px solid ${FOREST_T3}` }} />
              )}
            </div>
            <div className="w-6 text-right text-xs" style={{ color: FOREST_T3 }}>{m.count}</div>
          </div>
        )
      })}
    </div>
  )
}

function PatternFlags({ patterns, label }) {
  if (patterns.length === 0) {
    return <p className="text-xs mb-4" style={{ color: FOREST_T3 }}>No patterns detected in the last 12 months.</p>
  }
  return (
    <div className="rounded-md border px-4 py-3 mb-4" style={{ backgroundColor: MARMALADE_T1, borderColor: MARMALADE }}>
      <div className="text-sm font-bold mb-1" style={{ color: MARMALADE_SHADE }}>Patterns detected</div>
      <ul className="text-xs space-y-0.5" style={{ color: FOREST }}>
        {patterns.map((p, i) => <li key={i}>• {p}</li>)}
      </ul>
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="rounded-md px-3 py-2.5 mb-4" style={{ backgroundColor: FOREST }}>
      <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Ivar Display', Georgia, serif" }}>
        {title}
      </h2>
    </div>
  )
}

function InjuryTypeList({ types, total }) {
  if (types.length === 0) return null
  return (
    <ul className="space-y-1 text-sm">
      {types.map(({ category, count }, i) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <li key={i} className="flex items-baseline justify-between" style={{ color: FOREST }}>
            <span>• {category}</span>
            <span style={{ color: FOREST_T3 }}>{count} ({pct}%)</span>
          </li>
        )
      })}
    </ul>
  )
}

function OutdoorSection({ report }) {
  const { periodOutdoor, outdoorMonthly, outdoorPatterns, outdoorInjuryTypes, totalReports } = report
  const outdoorPct = totalReports > 0 ? Math.round((periodOutdoor.length / totalReports) * 100) : 0
  const outdoorMax = Math.max(1, ...outdoorMonthly.map(m => m.count))

  return (
    <section className="mb-8">
      <SectionHeader title="Outdoor / Garden Incidents" />
      <p className="text-sm mb-4" style={{ color: FOREST }}>
        {periodOutdoor.length} outdoor incident{periodOutdoor.length !== 1 ? 's' : ''} in this period
        <span style={{ color: FOREST_T3 }}> · {outdoorPct}% of all reports</span>
      </p>
      <PatternFlags patterns={outdoorPatterns} />
      <div className="mb-4">
        <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>Monthly trend (last 12 months)</div>
        <TrendBars monthly={outdoorMonthly} max={outdoorMax} />
      </div>
      {outdoorInjuryTypes.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>Injury types (outdoor)</div>
          <InjuryTypeList types={outdoorInjuryTypes} total={periodOutdoor.length} />
        </div>
      )}
    </section>
  )
}

function HomeOnArrivalSection({ report }) {
  const { periodHome, homeMonthly, homePatterns, homeInjuryTypes, homeIncs, settingIncs, totalReports } = report
  const homePct = totalReports > 0 ? Math.round((homeIncs.length / totalReports) * 100) : 0
  const settingPct = totalReports > 0 ? Math.round((settingIncs.length / totalReports) * 100) : 0
  const homeMax = Math.max(1, ...homeMonthly.map(m => m.count))

  return (
    <section className="mb-8">
      <SectionHeader title="Home / On-Arrival Incidents" />
      <div className="flex gap-6 mb-3 text-sm">
        <span style={{ color: FOREST }}>
          At setting: <strong>{settingIncs.length}</strong>
          <span style={{ color: FOREST_T3 }}> ({settingPct}%)</span>
        </span>
        <span style={{ color: FOREST }}>
          Home / on arrival: <strong>{homeIncs.length}</strong>
          <span style={{ color: FOREST_T3 }}> ({homePct}%)</span>
        </span>
      </div>
      <p className="text-xs mb-4" style={{ color: FOREST_T3 }}>
        Injuries where the child arrived already hurt, or where the location field records "Home".
        Recurring patterns may warrant a safeguarding conversation.
      </p>
      <PatternFlags patterns={homePatterns} />
      <div className="mb-4">
        <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>Monthly trend (last 12 months)</div>
        <TrendBars monthly={homeMonthly} max={homeMax} />
      </div>
      {homeInjuryTypes.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>Injury types (home / on-arrival)</div>
          <InjuryTypeList types={homeInjuryTypes} total={periodHome.length} />
        </div>
      )}
    </section>
  )
}

function ReviewedBySection() {
  return (
    <section className="mt-10 pt-4 border-t" style={{ borderColor: PEBBLE_SHADE }}>
      <h2 className="text-sm font-bold mb-3" style={{ color: FOREST }}>Reviewed by</h2>
      <div className="text-xs space-y-3" style={{ color: FOREST_T3 }}>
        <div className="flex gap-6">
          <span>Name: ________________________________</span>
          <span>Role: ________________</span>
          <span>Date: ____________</span>
        </div>
        <div>Comments: _____________________________________________________________________</div>
        <div>Actions: ______________________________________________________________________</div>
      </div>
    </section>
  )
}
