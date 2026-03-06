import { useState } from 'react'
import { childDisplayName, formatDate, formatTime } from '../../lib/famly/dataHelpers'

const KIND_COLOUR = {
  Accident: 'text-amber-700 bg-amber-50 border-amber-100',
  Incident: 'text-teal-700 bg-teal-50 border-teal-100',
}

function truncate(text, max = 80) {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…'
}

export default function RecentIncidentsList({ incidents }) {
  const [expanded, setExpanded] = useState(new Set())

  const recent = [...incidents]
    .sort((a, b) => new Date(b.happenedAt) - new Date(a.happenedAt))
    .slice(0, 10)

  function toggle(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">Recent incidents</h2>
      {recent.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No incidents to display</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {recent.map(inc => {
            const isOpen = expanded.has(inc.id)
            return (
              <div key={inc.id} className="py-3">
                <button className="w-full text-left" onClick={() => toggle(inc.id)}>
                  <div className="flex items-start gap-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${KIND_COLOUR[inc.kind] ?? KIND_COLOUR.Incident}`}>
                      {inc.kind}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-medium text-slate-800">{childDisplayName(inc.childName)}</span>
                        <span className="text-xs text-slate-400">{formatDate(inc.happenedAt)} at {formatTime(inc.happenedAt)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                        <span className="text-xs text-slate-500">{inc.location}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">{inc.injuryCategory}</span>
                      </div>
                      {!isOpen && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{truncate(inc.nature)}</p>}
                    </div>
                    <span className="text-slate-300 shrink-0 mt-0.5 text-xs">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="mt-3 ml-14 space-y-3 text-xs text-slate-600">
                    <div>
                      <p className="font-medium text-slate-500 mb-0.5 uppercase tracking-wide text-[10px]">What happened</p>
                      <p className="leading-relaxed">{inc.nature}</p>
                    </div>
                    {inc.firstAid && (
                      <div>
                        <p className="font-medium text-slate-500 mb-0.5 uppercase tracking-wide text-[10px]">First aid</p>
                        <p className="leading-relaxed">{inc.firstAid}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {inc.createdBy && <div><p className="font-medium text-slate-500 mb-0.5 uppercase tracking-wide text-[10px]">Recorded by</p><p>{inc.createdBy}</p></div>}
                      {inc.witnesses?.length > 0 && <div><p className="font-medium text-slate-500 mb-0.5 uppercase tracking-wide text-[10px]">Witnesses</p><p>{inc.witnesses.join(', ')}</p></div>}
                      {inc.approvedBy && <div><p className="font-medium text-slate-500 mb-0.5 uppercase tracking-wide text-[10px]">Approved by</p><p>{inc.approvedBy}</p></div>}
                      {inc.acknowledgedBy && <div><p className="font-medium text-slate-500 mb-0.5 uppercase tracking-wide text-[10px]">Acknowledged by</p><p>{inc.acknowledgedBy}</p></div>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
