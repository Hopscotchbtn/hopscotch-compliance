import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { classifyAll, childDisplayName, formatDate, abbreviateSite } from '../../lib/famly/dataHelpers'
import { computeAccidentReport } from '../../lib/famly/computeAccidentReport'
import { generateMonthlyReportPDF } from '../../lib/famly/generateMonthlyReportPDF'
import { generateReportSummary } from '../../lib/famly/reportSummary'

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
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
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
  // Always fetch at least 12 months back so outdoor/home trend charts have full data
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
  twelveMonthsAgo.setDate(1)
  const from = new Date(Math.min(period.from.getTime(), twelveMonthsAgo.getTime()))
  return { from, to: period.to }
}

function titleForPeriod(period) {
  if (period.type === 'ytd') return 'Year-to-Date Accident Review'
  if (period.type === '12month') return '12-Month Accident Review'
  return 'Monthly Accident Review'
}

export function AccidentReport() {
  const [searchParams] = useSearchParams()
  const siteId = searchParams.get('site') ?? ''
  const allSiteIds = searchParams.get('siteIds') ?? ''
  const isAnonymised = !!allSiteIds
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

        if (isAnonymised) {
          setSiteName('All Nurseries')
        } else {
          const sitesRes = await fetch('/api/famly-sites')
          if (!sitesRes.ok) throw new Error('Failed to load sites')
          const sites = await sitesRes.json()
          const site = sites.find(s => s.id === siteId)
          if (cancelled) return
          if (site) setSiteName(site.name)
        }

        const range = fetchRangeForPeriod(period)
        const fromStr = range.from.toISOString().slice(0, 10)
        const toStr = range.to.toISOString().slice(0, 10)
        const fetchParam = isAnonymised ? `siteIds=${allSiteIds}` : `siteId=${siteId}`
        const res = await fetch(`/api/famly-incidents?${fetchParam}&from=${fromStr}&to=${toStr}`)
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
    if (siteId || allSiteIds) load()
    else {
      setError('Missing site in URL')
      setLoading(false)
    }
    return () => { cancelled = true }
  }, [siteId, allSiteIds, period])

  const report = useMemo(() => {
    if (!incidents) return null
    return computeAccidentReport(incidents, period)
  }, [incidents, period])

  const handleDownload = useCallback(() => {
    if (!report) return
    generateMonthlyReportPDF(report, siteName, { anonymised: isAnonymised })
  }, [report, siteName, isAnonymised])

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

          {isAnonymised && <AcrossSiteSection report={report} />}

          {isAnonymised && period.type !== 'month' && <MonthlyBySiteSection report={report} />}

          {isAnonymised && period.type !== 'month' && <TimeOfDayBySiteSection report={report} />}

          <SectionHeader title="Overall" />

          <SummarySection report={report} />

          <KpiStrip report={report} />

          <RegulatoryFlagsBar report={report} anonymised={isAnonymised} />

          {!isAnonymised && <FormalReviewSection report={report} />}

          {!isAnonymised && <RepeatChildrenSection report={report} />}

          <InjuryTypeSection report={report} />

          <LocationSection report={report} />

          <DayOfWeekSection report={report} />

          <TimeOfDaySection report={report} />

          <AtNurserySection report={report} anonymised={isAnonymised} />

          <HomeOnArrivalSection report={report} anonymised={isAnonymised} />

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

function SummarySection({ report }) {
  const summary = generateReportSummary(report)
  return (
    <div
      className="rounded-lg border px-4 py-3 mb-6 text-sm leading-relaxed"
      style={{ backgroundColor: FOREST_T1, borderColor: FOREST_T3, color: FOREST }}
    >
      {summary}
    </div>
  )
}

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

function RegulatoryFlagsBar({ report, anonymised = false }) {
  const { riddorCount, ofstedCount, ladoCount, riddorIncs, ofstedIncs, ladoIncs } = report
  if (riddorCount + ofstedCount + ladoCount === 0) return null
  const flags = [
    { label: 'RIDDOR', incs: riddorIncs },
    { label: 'Ofsted notifiable', incs: ofstedIncs },
    { label: 'LADO', incs: ladoIncs },
  ].filter(f => f.incs.length > 0)
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold mb-3" style={{ color: FOREST, fontFamily: "'Ivar Display', Georgia, serif" }}>
        Regulatory flags
      </h2>
      <div className="space-y-4">
        {flags.map(({ label, incs }) => (
          <div key={label} className="rounded-md border px-4 py-3" style={{ backgroundColor: MARMALADE_T1, borderColor: MARMALADE }}>
            <div className="text-sm font-bold mb-2" style={{ color: MARMALADE_SHADE }}>{label} · {incs.length}</div>
            {!anonymised && (
              <ul className="space-y-1 text-sm" style={{ color: FOREST }}>
                {incs.map((inc, i) => (
                  <li key={i}>• {childDisplayName(inc.childName)} · {formatDate(inc.happenedAt)} · {inc.injuryCategory}{inc.location ? ` · ${inc.location}` : ''}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function FormalReviewSection({ report }) {
  const { high, medium, period } = report
  if (high.length === 0 && medium.length === 0) return null
  const showList = period.type !== '12month'
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
          {showList && (
            <ul className="mt-1 space-y-1 text-sm" style={{ color: FOREST }}>
              {high.map((inc, i) => (
                <li key={i}>
                  • {childDisplayName(inc.childName)} · {formatDate(inc.happenedAt)} · {inc.injuryCategory} · {(inc.location || '').slice(0, 40)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {medium.length > 0 && (
        <div>
          <div className="text-sm font-bold" style={{ color: MARMALADE_SHADE }}>
            Medium priority · {medium.length}
          </div>
          {showList && (
            <ul className="mt-1 space-y-1 text-sm" style={{ color: FOREST }}>
              {medium.map((inc, i) => (
                <li key={i}>
                  • {childDisplayName(inc.childName)} · {formatDate(inc.happenedAt)} · {inc.injuryCategory} · {(inc.location || '').slice(0, 40)}
                </li>
              ))}
            </ul>
          )}
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
          {report.period.type === '12month' ? (
            <div className="space-y-1.5">
              {siteLocs.map((loc, i) => {
                const locMax = Math.max(1, ...siteLocs.map(l => l.count))
                const pct = (loc.count / locMax) * 100
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-32 truncate" style={{ color: FOREST }}>{loc.location}</div>
                    <div className="flex-1 h-4 rounded" style={{ backgroundColor: PEBBLE }}>
                      <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: FOREST_T1, border: `1px solid ${FOREST_T3}` }} />
                    </div>
                    <div className="w-8 text-right" style={{ color: FOREST_T3 }}>{loc.count}</div>
                  </div>
                )
              })}
            </div>
          ) : (
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
          )}
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

function TimeOfDaySection({ report }) {
  const { hourCounts, totalReports } = report
  if (totalReports === 0) return null
  const hours = hourCounts || []
  if (!hours.some(h => h.count > 0)) return null
  const hourMax = Math.max(1, ...hours.map(h => h.count))
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold mb-3" style={{ color: FOREST, fontFamily: "'Ivar Display', Georgia, serif" }}>
        Time of day
      </h2>
      <div className="space-y-1.5">
        {hours.map(({ hour, count }) => {
          const pct = (count / hourMax) * 100
          const label = `${String(hour).padStart(2, '0')}:00`
          return (
            <div key={hour} className="flex items-center gap-3 text-sm">
              <div className="w-12" style={{ color: FOREST }}>{label}</div>
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

function AcrossSiteSection({ report }) {
  const { siteComparison } = report
  if (!siteComparison || siteComparison.length === 0) return null
  return (
    <section className="mb-8">
      <SectionHeader title="Across Site View" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: `2px solid ${PEBBLE_SHADE}` }}>
              <th className="text-left py-2 pr-3 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Site</th>
              <th className="text-right py-2 px-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Total</th>
              <th className="text-right py-2 px-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>High</th>
              <th className="text-right py-2 px-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Medium</th>
              <th className="text-right py-2 px-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Ack. rate</th>
              <th className="text-right py-2 px-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Home / on arrival</th>
              <th className="text-right py-2 pl-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Regulatory</th>
            </tr>
          </thead>
          <tbody>
            {siteComparison.map((site, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${PEBBLE}` }}>
                <td className="py-2 pr-3 font-medium" style={{ color: FOREST }}>{abbreviateSite(site.siteName)}</td>
                <td className="py-2 px-2 text-right font-semibold" style={{ color: FOREST }}>{site.total}</td>
                <td className="py-2 px-2 text-right font-semibold" style={{ color: site.high > 0 ? '#991b1b' : FOREST_T3 }}>{site.high}</td>
                <td className="py-2 px-2 text-right font-semibold" style={{ color: site.medium > 0 ? MARMALADE_SHADE : FOREST_T3 }}>{site.medium}</td>
                <td className="py-2 px-2 text-right" style={{ color: site.ackRate < 80 ? MARMALADE_SHADE : FOREST }}>{site.ackRate}%</td>
                <td className="py-2 px-2 text-right" style={{ color: FOREST }}>{site.homeCount}</td>
                <td className="py-2 pl-2 text-right font-semibold" style={{ color: site.regulatoryCount > 0 ? MARMALADE_SHADE : FOREST_T3 }}>{site.regulatoryCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs mt-2" style={{ color: FOREST_T3 }}>
        High / medium: auto-flagged by keyword. Regulatory: RIDDOR, Ofsted notifiable, or LADO. Ack. rate highlighted if below 80%.
      </p>
    </section>
  )
}

function MonthlyBySiteSection({ report }) {
  const data = report.siteMonthlyComparison
  if (!data) return null
  const { months, nursery, home, nurseryMonthTotals, homeMonthTotals, nurseryGrandTotal, homeGrandTotal } = data

  return (
    <section className="mb-8">
      <SectionHeader title="Monthly accidents by site" />
      <MonthlyPivotTable
        title="At nursery"
        months={months}
        rows={nursery}
        monthTotals={nurseryMonthTotals}
        grandTotal={nurseryGrandTotal}
      />
      <div className="mt-5">
        <MonthlyPivotTable
          title="At home / on arrival"
          months={months}
          rows={home}
          monthTotals={homeMonthTotals}
          grandTotal={homeGrandTotal}
        />
      </div>
      <p className="text-xs mt-2" style={{ color: FOREST_T3 }}>
        Trailing 12 months. "At nursery" excludes incidents flagged as home or on-arrival.
      </p>
    </section>
  )
}

function MonthlyPivotTable({ title, months, rows, monthTotals, grandTotal }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2" style={{ color: FOREST }}>{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ borderBottom: `2px solid ${PEBBLE_SHADE}` }}>
              <th className="text-left py-1.5 pr-2 font-semibold uppercase tracking-wide" style={{ color: FOREST_T3 }}>Site</th>
              {months.map(m => (
                <th key={m.yearMonth} className="text-right py-1.5 px-1 font-semibold uppercase tracking-wide" style={{ color: FOREST_T3 }}>
                  {m.label}
                </th>
              ))}
              <th className="text-right py-1.5 pl-2 font-semibold uppercase tracking-wide" style={{ color: FOREST_T3 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.siteName} style={{ borderBottom: `1px solid ${PEBBLE}` }}>
                <td className="py-1.5 pr-2 font-medium whitespace-nowrap" style={{ color: FOREST }}>{abbreviateSite(row.siteName)}</td>
                {row.counts.map((c, i) => (
                  <td key={i} className="py-1.5 px-1 text-right" style={{ color: c === 0 ? PEBBLE_SHADE : FOREST }}>
                    {c}
                  </td>
                ))}
                <td className="py-1.5 pl-2 text-right font-semibold" style={{ color: FOREST }}>{row.total}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${PEBBLE_SHADE}` }}>
              <td className="py-1.5 pr-2 font-semibold uppercase tracking-wide text-xs" style={{ color: FOREST_T3 }}>Total</td>
              {monthTotals.map((c, i) => (
                <td key={i} className="py-1.5 px-1 text-right font-semibold" style={{ color: c === 0 ? PEBBLE_SHADE : FOREST }}>
                  {c}
                </td>
              ))}
              <td className="py-1.5 pl-2 text-right font-semibold" style={{ color: FOREST }}>{grandTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SiteBreakdownTable({ rows, metric, total }) {
  return (
    <div className="mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: `2px solid ${PEBBLE_SHADE}` }}>
              <th className="text-left py-1.5 pr-3 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Site</th>
              <th className="text-right py-1.5 pl-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.siteName} style={{ borderBottom: `1px solid ${PEBBLE}` }}>
                <td className="py-1.5 pr-3 font-medium" style={{ color: FOREST }}>{abbreviateSite(row.siteName)}</td>
                <td className="py-1.5 pl-2 text-right font-semibold" style={{ color: row[metric] === 0 ? PEBBLE_SHADE : FOREST }}>{row[metric]}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${PEBBLE_SHADE}` }}>
              <td className="py-1.5 pr-3 font-semibold uppercase tracking-wide text-xs" style={{ color: FOREST_T3 }}>Total</td>
              <td className="py-1.5 pl-2 text-right font-semibold" style={{ color: FOREST }}>{total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TimeOfDayBySiteSection({ report }) {
  const data = report.siteTimeOfDayComparison
  if (!data) return null
  const { buckets, rows, bucketTotals } = data
  return (
    <section className="mb-8">
      <SectionHeader title="Time of day by site" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ borderBottom: `2px solid ${PEBBLE_SHADE}` }}>
              <th className="text-left py-1.5 pr-2 font-semibold uppercase tracking-wide" style={{ color: FOREST_T3 }}>Site</th>
              {buckets.map(b => (
                <th key={b.key} className="text-right py-1.5 px-1 font-semibold uppercase tracking-wide" style={{ color: FOREST_T3 }}>
                  {b.label}
                </th>
              ))}
              <th className="text-right py-1.5 pl-2 font-semibold uppercase tracking-wide" style={{ color: FOREST_T3 }}>Peak time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.siteName} style={{ borderBottom: `1px solid ${PEBBLE}` }}>
                <td className="py-1.5 pr-2 font-medium whitespace-nowrap" style={{ color: FOREST }}>{abbreviateSite(row.siteName)}</td>
                {row.counts.map((c, i) => (
                  <td key={i} className="py-1.5 px-1 text-right" style={{ color: c === 0 ? PEBBLE_SHADE : FOREST }}>
                    {c}
                  </td>
                ))}
                <td className="py-1.5 pl-2 text-right whitespace-nowrap" style={{ color: FOREST_T3 }}>{row.peakLabel}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${PEBBLE_SHADE}` }}>
              <td className="py-1.5 pr-2 font-semibold uppercase tracking-wide text-xs" style={{ color: FOREST_T3 }}>Total</td>
              {bucketTotals.map((c, i) => (
                <td key={i} className="py-1.5 px-1 text-right font-semibold" style={{ color: c === 0 ? PEBBLE_SHADE : FOREST }}>
                  {c}
                </td>
              ))}
              <td className="py-1.5 pl-2"></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs mt-2" style={{ color: FOREST_T3 }}>
        Counts incidents in this period by their recorded time. Out-of-hours incidents are grouped into Before 7am and After 7pm; the rest are shown hour by hour. Empty buckets are omitted. Peak time is the busiest bucket for each site.
      </p>
    </section>
  )
}

function PatternFlags({ patterns }) {
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

function AtNurserySection({ report, anonymised = false }) {
  const {
    settingIncs, nurseryRepeats, totalReports,
    nurseryAcknowledged, nurseryAckRate, nurseryHigh, nurseryMedium,
    nurseryDowCounts, nurserySortedIncs, nurseryInjuryTypes, nurseryLocs,
    nurseryMonthly, nurseryPatterns,
    dowOrder,
  } = report
  const nurseryPct = totalReports > 0 ? Math.round((settingIncs.length / totalReports) * 100) : 0
  const nurseryMax = Math.max(1, ...nurseryMonthly.map(m => m.count))
  const nurseryDowMax = Math.max(1, ...Object.values(nurseryDowCounts))

  const kpiCards = [
    {
      label: 'At nursery',
      value: String(settingIncs.length),
      sub: `${nurseryPct}% of all reports`,
    },
    {
      label: 'Parent acknowledged',
      value: `${nurseryAckRate}%`,
      sub: `${nurseryAcknowledged} of ${settingIncs.length}`,
    },
    {
      label: 'Needs formal review',
      value: String(nurseryHigh.length + nurseryMedium.length),
      sub: `${nurseryHigh.length} high · ${nurseryMedium.length} medium`,
      warn: nurseryHigh.length + nurseryMedium.length > 0,
    },
  ]

  const nurseryDowRows = dowOrder.filter(d => {
    if (d === 'Saturday' || d === 'Sunday') return nurseryDowCounts[d] > 0
    return true
  })

  const breakdown = report.siteMonthlyBreakdown
  return (
    <section className="mb-8">
      <SectionHeader title="At Nursery" />

      {breakdown && (
        <SiteBreakdownTable
          rows={breakdown.rows}
          metric="nursery"
          total={breakdown.nurseryTotal}
        />
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
        {kpiCards.map((card, i) => (
          <div
            key={i}
            className="rounded-lg border p-3"
            style={{
              backgroundColor: card.warn ? '#fef2f2' : PEBBLE_T2,
              borderColor: card.warn ? '#fca5a5' : PEBBLE_SHADE,
            }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: FOREST_T3 }}>{card.label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color: card.warn ? '#991b1b' : FOREST, fontFamily: "'Ivar Display', Georgia, serif" }}>{card.value}</div>
            <div className="text-[11px] mt-0.5" style={{ color: FOREST_T3 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Formal review */}
      {(nurseryHigh.length > 0 || nurseryMedium.length > 0) && (
        <div className="mb-6">
          <div className="text-sm font-bold mb-1" style={{ color: FOREST }}>Needs formal review</div>
          <p className="text-xs mb-2" style={{ color: FOREST_T3 }}>Auto-flagged by keyword match — please review each for context.</p>
          {nurseryHigh.length > 0 && (
            <div className="mb-2">
              <div className="text-sm font-bold" style={{ color: '#991b1b' }}>High priority · {nurseryHigh.length}</div>
              {!anonymised && report.period.type !== '12month' && (
                <ul className="mt-1 space-y-1 text-sm" style={{ color: FOREST }}>
                  {nurseryHigh.map((inc, i) => (
                    <li key={i}>• {childDisplayName(inc.childName)} · {formatDate(inc.happenedAt)} · {inc.injuryCategory} · {(inc.location || '').slice(0, 40)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {nurseryMedium.length > 0 && (
            <div>
              <div className="text-sm font-bold" style={{ color: MARMALADE_SHADE }}>Medium priority · {nurseryMedium.length}</div>
              {!anonymised && report.period.type !== '12month' && (
                <ul className="mt-1 space-y-1 text-sm" style={{ color: FOREST }}>
                  {nurseryMedium.map((inc, i) => (
                    <li key={i}>• {childDisplayName(inc.childName)} · {formatDate(inc.happenedAt)} · {inc.injuryCategory} · {(inc.location || '').slice(0, 40)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <PatternFlags patterns={nurseryPatterns} />

      {/* Repeat children */}
      {!anonymised && nurseryRepeats.length > 0 && (
        <div className="rounded-md border px-4 py-3 mb-4" style={{ backgroundColor: MARMALADE_T1, borderColor: MARMALADE }}>
          <div className="text-sm font-bold mb-2" style={{ color: MARMALADE_SHADE }}>
            Children with repeated nursery reports this period
          </div>
          <div className="space-y-3">
            {nurseryRepeats.map((child, i) => (
              <div key={i}>
                <div className="text-sm font-semibold" style={{ color: FOREST }}>{child.displayName} — {child.count} reports</div>
                {report.period.type !== '12month' && (
                  <ul className="mt-1 space-y-0.5">
                    {child.incidents.map((inc, j) => (
                      <li key={j} className="text-xs" style={{ color: FOREST_T3 }}>
                        • {formatDate(inc.date)} · {inc.injuryCategory}{inc.location ? ` · ${inc.location}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Injury types */}
      {nurseryInjuryTypes.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>Injury types</div>
          <InjuryTypeList types={nurseryInjuryTypes} total={settingIncs.length} />
        </div>
      )}

      {/* Location */}
      {nurseryLocs.length > 0 && !(anonymised && report.period.type === '12month') && (
        <div className="mb-6">
          <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>Where they happen</div>
          {report.period.type === '12month' ? (
            <div className="space-y-1.5">
              {nurseryLocs.map((loc, i) => {
                const locMax = Math.max(1, nurseryLocs[0].count)
                const pct = (loc.count / locMax) * 100
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-32 truncate" style={{ color: FOREST }}>{loc.location || '(blank)'}</div>
                    <div className="flex-1 h-4 rounded" style={{ backgroundColor: PEBBLE }}>
                      <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: FOREST_T1, border: `1px solid ${FOREST_T3}` }} />
                    </div>
                    <div className="w-8 text-right" style={{ color: FOREST_T3 }}>{loc.count}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <ul className="space-y-1 text-sm">
              {nurseryLocs.slice(0, 5).map((loc, i) => {
                const pct = settingIncs.length > 0 ? Math.round((loc.count / settingIncs.length) * 100) : 0
                return (
                  <li key={i} className="flex items-baseline justify-between" style={{ color: FOREST }}>
                    <span>• {loc.location}</span>
                    <span style={{ color: FOREST_T3 }}>{loc.count} ({pct}%)</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Day of week */}
      {settingIncs.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>When they happen</div>
          <div className="space-y-1.5">
            {nurseryDowRows.map(day => {
              const count = nurseryDowCounts[day]
              const pct = (count / nurseryDowMax) * 100
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
        </div>
      )}

      {/* Monthly trend */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>Monthly trend (last 12 months)</div>
        <TrendBars monthly={nurseryMonthly} max={nurseryMax} />
      </div>

    </section>
  )
}

function HomeOnArrivalSection({ report, anonymised = false }) {
  const {
    homeIncs, settingIncs, homeRepeats, totalReports,
    homeAcknowledged, homeAckRate, homeHigh, homeMedium,
    homeDowCounts, homeSortedIncs, home3MonthSortedIncs, homeRepeats3Month,
    periodHome, homeMonthly, homePatterns, homeInjuryTypes,
    dowOrder,
  } = report
  const homePct = totalReports > 0 ? Math.round((homeIncs.length / totalReports) * 100) : 0
  const settingPct = totalReports > 0 ? Math.round((settingIncs.length / totalReports) * 100) : 0
  const homeMax = Math.max(1, ...homeMonthly.map(m => m.count))
  const homeDowMax = Math.max(1, ...Object.values(homeDowCounts))

  const kpiCards = [
    {
      label: 'Home / on arrival',
      value: String(homeIncs.length),
      sub: `${homePct}% of all reports`,
    },
    {
      label: 'At setting',
      value: String(settingIncs.length),
      sub: `${settingPct}% of all reports`,
    },
    {
      label: 'Parent acknowledged',
      value: `${homeAckRate}%`,
      sub: `${homeAcknowledged} of ${homeIncs.length}`,
    },
    {
      label: 'Needs formal review',
      value: String(homeHigh.length + homeMedium.length),
      sub: `${homeHigh.length} high · ${homeMedium.length} medium`,
      warn: homeHigh.length + homeMedium.length > 0,
    },
  ]

  const homeDowRows = dowOrder.filter(d => {
    if (d === 'Saturday' || d === 'Sunday') return homeDowCounts[d] > 0
    return true
  })

  const breakdown = report.siteMonthlyBreakdown
  return (
    <section className="mb-8">
      <SectionHeader title="Home / On-Arrival Incidents" />
      <p className="text-xs mb-4" style={{ color: FOREST_T3 }}>
        Injuries where the child arrived already hurt, or where the location field records "Home".
        Recurring patterns may warrant a safeguarding conversation.
      </p>

      {breakdown && (
        <SiteBreakdownTable
          rows={breakdown.rows}
          metric="home"
          total={breakdown.homeTotal}
        />
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {kpiCards.map((card, i) => (
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

      {/* Formal review flags */}
      {(homeHigh.length > 0 || homeMedium.length > 0) && (
        <div className="mb-6">
          <div className="text-sm font-bold mb-1" style={{ color: FOREST }}>Needs formal review</div>
          <p className="text-xs mb-2" style={{ color: FOREST_T3 }}>Auto-flagged by keyword match — please review each for context.</p>
          {homeHigh.length > 0 && (
            <div className="mb-2">
              <div className="text-sm font-bold" style={{ color: '#991b1b' }}>High priority · {homeHigh.length}</div>
              {!anonymised && report.period.type !== '12month' && (
                <ul className="mt-1 space-y-1 text-sm" style={{ color: FOREST }}>
                  {homeHigh.map((inc, i) => (
                    <li key={i}>• {childDisplayName(inc.childName)} · {formatDate(inc.happenedAt)} · {inc.injuryCategory}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {homeMedium.length > 0 && (
            <div>
              <div className="text-sm font-bold" style={{ color: MARMALADE_SHADE }}>Medium priority · {homeMedium.length}</div>
              {!anonymised && report.period.type !== '12month' && (
                <ul className="mt-1 space-y-1 text-sm" style={{ color: FOREST }}>
                  {homeMedium.map((inc, i) => (
                    <li key={i}>• {childDisplayName(inc.childName)} · {formatDate(inc.happenedAt)} · {inc.injuryCategory}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <PatternFlags patterns={homePatterns} />

      {/* Repeat children — 12-month reports only; monthly uses the 3-month section below */}
      {!anonymised && report.period.type === '12month' && homeRepeats.length > 0 && (
        <div
          className="rounded-md border px-4 py-3 mb-4"
          style={{ backgroundColor: MARMALADE_T1, borderColor: MARMALADE }}
        >
          <div className="text-sm font-bold mb-2" style={{ color: MARMALADE_SHADE }}>
            Children with repeated home / on-arrival reports this period
          </div>
          <div className="space-y-3">
            {homeRepeats.map((child, i) => (
              <div key={i}>
                <div className="text-sm font-semibold" style={{ color: FOREST }}>{child.displayName} — {child.count} reports</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Injury types */}
      {homeInjuryTypes.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>Injury types</div>
          <InjuryTypeList types={homeInjuryTypes} total={periodHome.length} />
        </div>
      )}

      {/* Day of week */}
      {homeIncs.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>When they happen</div>
          <div className="space-y-1.5">
            {homeDowRows.map(day => {
              const count = homeDowCounts[day]
              const pct = (count / homeDowMax) * 100
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
        </div>
      )}

      {/* Monthly trend */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-2" style={{ color: FOREST }}>Monthly trend (last 12 months)</div>
        <TrendBars monthly={homeMonthly} max={homeMax} />
      </div>

      {/* Monthly-only: this-period list, 3-month list, 3-month repeats */}
      {!anonymised && report.period.type !== '12month' && (
        <div className="space-y-6">

          {/* All incidents this period */}
          <div>
            <div className="text-sm font-semibold mb-1" style={{ color: FOREST }}>All incidents this period</div>
            <p className="text-xs mb-2" style={{ color: FOREST_T3 }}>
              Home / on-arrival incidents recorded in {report.period.label} only.
            </p>
            {homeSortedIncs.length === 0 ? (
              <p className="text-sm italic" style={{ color: FOREST_T3 }}>No at-home accidents this month.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${PEBBLE_SHADE}` }}>
                    <th className="text-left py-1.5 pr-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Child</th>
                    <th className="text-left py-1.5 pr-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Date</th>
                    <th className="text-left py-1.5 pr-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Injury</th>
                    <th className="text-left py-1.5 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Acknowledged</th>
                  </tr>
                </thead>
                <tbody>
                  {homeSortedIncs.map((inc, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${PEBBLE}` }}>
                      <td className="py-1.5 pr-2" style={{ color: FOREST }}>{childDisplayName(inc.childName)}</td>
                      <td className="py-1.5 pr-2" style={{ color: FOREST }}>{formatDate(inc.happenedAt)}</td>
                      <td className="py-1.5 pr-2" style={{ color: FOREST }}>{inc.injuryCategory}</td>
                      <td className="py-1.5" style={{ color: inc.acknowledgedAt ? APPLE : MARMALADE_SHADE }}>
                        {inc.acknowledgedAt ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Children with repeated incidents this period */}
          {homeRepeats.length > 0 && (
            <div
              className="rounded-md border px-4 py-3"
              style={{ backgroundColor: MARMALADE_T1, borderColor: MARMALADE }}
            >
              <div className="text-sm font-bold mb-1" style={{ color: MARMALADE_SHADE }}>
                Children with repeated home incidents — this period
              </div>
              <p className="text-xs mb-2" style={{ color: FOREST_T3 }}>
                Children with 2 or more home / on-arrival incidents within {report.period.label}.
              </p>
              <div className="space-y-3">
                {homeRepeats.map((child, i) => (
                  <div key={i}>
                    <div className="text-sm font-semibold" style={{ color: FOREST }}>{child.displayName} — {child.count} incidents</div>
                    <ul className="mt-1 space-y-0.5">
                      {child.incidents.map((inc, j) => (
                        <li key={j} className="text-xs" style={{ color: FOREST_T3 }}>
                          • {formatDate(inc.date)} · {inc.injuryCategory}
                          {inc.onArrival ? ' · arrived with injury' : ` · location: ${inc.location || 'Home'}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All home incidents — last 3 months */}
          <div>
            <div className="text-sm font-semibold mb-1" style={{ color: FOREST }}>All home / on-arrival incidents — last 3 months</div>
            <p className="text-xs mb-2" style={{ color: FOREST_T3 }}>
              Includes this period. Use to spot patterns across recent months.
            </p>
            {home3MonthSortedIncs.length === 0 ? (
              <p className="text-sm italic" style={{ color: FOREST_T3 }}>No at-home incidents in the last 3 months.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${PEBBLE_SHADE}` }}>
                    <th className="text-left py-1.5 pr-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Child</th>
                    <th className="text-left py-1.5 pr-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Date</th>
                    <th className="text-left py-1.5 pr-2 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Injury</th>
                    <th className="text-left py-1.5 font-semibold text-xs uppercase tracking-wide" style={{ color: FOREST_T3 }}>Acknowledged</th>
                  </tr>
                </thead>
                <tbody>
                  {home3MonthSortedIncs.map((inc, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${PEBBLE}` }}>
                      <td className="py-1.5 pr-2" style={{ color: FOREST }}>{childDisplayName(inc.childName)}</td>
                      <td className="py-1.5 pr-2" style={{ color: FOREST }}>{formatDate(inc.happenedAt)}</td>
                      <td className="py-1.5 pr-2" style={{ color: FOREST }}>{inc.injuryCategory}</td>
                      <td className="py-1.5" style={{ color: inc.acknowledgedAt ? APPLE : MARMALADE_SHADE }}>
                        {inc.acknowledgedAt ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Children with multiple incidents in last 3 months */}
          {homeRepeats3Month.length > 0 && (
            <div
              className="rounded-md border px-4 py-3"
              style={{ backgroundColor: MARMALADE_T1, borderColor: MARMALADE }}
            >
              <div className="text-sm font-bold mb-1" style={{ color: MARMALADE_SHADE }}>
                Children with multiple home incidents — last 3 months
              </div>
              <p className="text-xs mb-2" style={{ color: FOREST_T3 }}>
                These children appear more than once across the rolling 3-month window. This may warrant a safeguarding conversation.
              </p>
              <div className="space-y-3">
                {homeRepeats3Month.map((child, i) => (
                  <div key={i}>
                    <div className="text-sm font-semibold" style={{ color: FOREST }}>{child.displayName} — {child.count} incidents</div>
                    <ul className="mt-1 space-y-0.5">
                      {child.incidents.map((inc, j) => (
                        <li key={j} className="text-xs" style={{ color: FOREST_T3 }}>
                          • {formatDate(inc.date)} · {inc.injuryCategory}
                          {inc.onArrival ? ' · arrived with injury' : ` · location: ${inc.location || 'Home'}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

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
