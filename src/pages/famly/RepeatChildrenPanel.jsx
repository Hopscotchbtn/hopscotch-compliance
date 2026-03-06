import { repeatChildren, rollingWindow, formatDate } from '../../lib/famly/dataHelpers'

export default function RepeatChildrenPanel({ incidents }) {
  const children = repeatChildren(rollingWindow(incidents, 3), 2)

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-1 gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Repeat children</h2>
        <span className="text-xs bg-stone-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">Rolling 3 months</span>
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mb-4">
        For manager awareness only · not a safeguarding record
      </p>
      {children.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No children with 2+ incidents in the last 3 months</p>
      ) : (
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 truncate">{child.displayName}</span>
                    {isFlag && (
                      <span className="text-xs font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded shrink-0">
                        ⚑ Review
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
      )}
    </div>
  )
}
