import { repeatChildren, rollingWindow, formatDate } from '../../lib/famly/dataHelpers'

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1, 2].map(i => (
        <div key={i} className="h-14 bg-stone-100 rounded-md" />
      ))}
    </div>
  )
}

export default function RepeatChildrenPanel({ incidents, loading }) {
  const children = repeatChildren(rollingWindow(incidents, 3), 2)

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Repeat children</h2>
        <span className="text-xs bg-stone-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">Rolling 3 months</span>
      </div>

      {/* Prominent GDPR / safeguarding notice — always visible first */}
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
        <p className="text-xs font-semibold text-amber-800 mb-0.5">For manager awareness only</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          This list shows children with repeated incidents — it is <strong>not a safeguarding record</strong> and does not distinguish between unrelated accidents and concerning patterns.
          If you have a safeguarding concern, contact your DSL directly and do not rely on this tool alone.
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
                <div
                  key={child.fullName}
                  className={`flex items-center justify-between rounded-md px-3 py-2.5 text-sm ${
                    isFlag ? 'bg-red-50 border border-red-100' : 'bg-stone-50 border border-stone-100'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800">{child.displayName}</span>
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
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      Last: {child.mostRecentLocation} · {formatDate(child.mostRecentDate)}
                    </p>
                  </div>
                  <div className={`text-2xl font-bold ml-4 shrink-0 ${isFlag ? 'text-red-600' : 'text-amber-600'}`}>
                    {child.count}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-stone-100 flex gap-4 text-xs text-slate-400">
            <span><span className="text-amber-600 font-medium">Monitor</span> = 2 incidents</span>
            <span><span className="text-red-600 font-medium">⚑ Discuss with DSL</span> = 3 or more</span>
          </div>
        </>
      )}
    </div>
  )
}
