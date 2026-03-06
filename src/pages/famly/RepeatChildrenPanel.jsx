import { useState } from 'react'
import { repeatChildren, rollingWindow, formatDate, formatTime } from '../../lib/famly/dataHelpers'

// Best-guess Famly profile URL — adjust if the actual URL pattern differs
function famlyProfileUrl(childId) {
  if (!childId || childId.startsWith('mock-')) return null
  return `https://app.famly.co/children/${childId}`
}

function ChildHistoryModal({ child, allIncidents, onClose }) {
  const history = allIncidents
    .filter(inc => inc.childName === child.fullName)
    .sort((a, b) => new Date(b.happenedAt) - new Date(a.happenedAt))

  const profileUrl = famlyProfileUrl(history[0]?.childId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 pb-8"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-start justify-between p-4 border-b border-stone-100">
          <div>
            <h3 className="font-semibold text-slate-800">{child.displayName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {history.length} incident{history.length !== 1 ? 's' : ''} on record
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {profileUrl && (
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-teal-700 bg-teal-50 border border-teal-100 hover:bg-teal-100 px-2.5 py-1.5 rounded-md transition-colors"
              >
                Open in Famly ↗
              </a>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none px-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Incident list */}
        <div className="overflow-y-auto flex-1 divide-y divide-stone-100">
          {history.map(inc => (
            <div key={inc.id} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${
                  inc.kind === 'Accident'
                    ? 'text-amber-700 bg-amber-50 border-amber-100'
                    : 'text-teal-700 bg-teal-50 border-teal-100'
                }`}>
                  {inc.kind}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-medium text-slate-700">{formatDate(inc.happenedAt)}</span>
                    <span className="text-xs text-slate-400">{formatTime(inc.happenedAt)}</span>
                    <span className="text-xs text-slate-500">{inc.location}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{inc.nature}</p>
                  {inc.firstAid && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      <span className="font-medium">First aid:</span> {inc.firstAid}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-stone-100 text-xs text-slate-400">
          Showing all incidents for this child across selected site(s)
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1, 2].map(i => <div key={i} className="h-14 bg-stone-100 rounded-md" />)}
    </div>
  )
}

export default function RepeatChildrenPanel({ incidents, loading }) {
  const [selectedChild, setSelectedChild] = useState(null)

  const children = repeatChildren(rollingWindow(incidents, 3), 2)

  return (
    <>
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3 gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Repeat children</h2>
          <span className="text-xs bg-stone-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">Rolling 3 months</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
          <p className="text-xs font-semibold text-amber-800 mb-0.5">For manager awareness only</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            This list flags children with repeated incidents — it is <strong>not a safeguarding record</strong> and does not
            distinguish between unrelated accidents and concerning patterns. If you have a safeguarding concern,
            contact your DSL directly.
          </p>
        </div>

        {loading ? (
          <Skeleton />
        ) : children.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            No children with 2 or more incidents in the last 3 months
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {children.map(child => {
                const isFlag = child.count >= 3
                return (
                  <button
                    key={child.fullName}
                    onClick={() => setSelectedChild(child)}
                    className={`w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-left transition-colors ${
                      isFlag
                        ? 'bg-red-50 border border-red-100 hover:bg-red-100'
                        : 'bg-stone-50 border border-stone-100 hover:bg-stone-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 underline decoration-dotted underline-offset-2">
                          {child.displayName}
                        </span>
                        {isFlag ? (
                          <span className="text-xs font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded shrink-0">
                            ⚑ Discuss with DSL
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded shrink-0">
                            Monitor
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {child.siteName && (
                          <span className="font-medium">{child.siteName} · </span>
                        )}
                        Last: {child.mostRecentLocation} · {formatDate(child.mostRecentDate)}
                        <span className="text-slate-400 ml-1">— tap to view history</span>
                      </p>
                    </div>
                    <div className={`text-2xl font-bold ml-4 shrink-0 ${isFlag ? 'text-red-600' : 'text-amber-600'}`}>
                      {child.count}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-stone-100 flex gap-4 text-xs text-slate-400">
              <span><span className="text-amber-600 font-medium">Monitor</span> = 2 incidents</span>
              <span><span className="text-red-600 font-medium">⚑ Discuss with DSL</span> = 3 or more</span>
            </div>
          </>
        )}
      </div>

      {selectedChild && (
        <ChildHistoryModal
          child={selectedChild}
          allIncidents={incidents}
          onClose={() => setSelectedChild(null)}
        />
      )}
    </>
  )
}
