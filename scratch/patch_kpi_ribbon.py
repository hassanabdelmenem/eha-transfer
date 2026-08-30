import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

target_kpi = """      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : stats.map((stat, i) => (
          <div key={i} className={`p-4 border border-slate-200 dark:border-slate-800 rounded shadow-sm flex flex-col justify-between ${stat.bg}`}>
            <span className={`text-xs font-bold  ${stat.labelColor}`}>{stat.label}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-3xl font-light ${stat.valueColor}`}>{stat.value}</span>
              <span className={`text-xs px-1 rounded ${stat.badgeBg} ${stat.badgeText}`}>{stat.badgeLabel}</span>
            </div>
          </div>
        ))}
      </div>"""

replacement_kpi = """      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="p-5"><Skeleton className="h-16 w-full" /></div>)
          ) : stats.map((stat, i) => (
            <div key={i} className={`p-5 flex flex-col justify-between ${stat.bg === 'bg-blue-900' ? 'bg-blue-600 dark:bg-blue-900' : 'bg-transparent'}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${stat.bg === 'bg-blue-900' ? 'text-blue-100' : stat.labelColor}`}>{stat.label}</span>
              <div className="flex items-baseline justify-between gap-2 mt-3">
                <span className={`text-4xl font-light ${stat.bg === 'bg-blue-900' ? 'text-white' : stat.valueColor}`}>{stat.value}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${stat.bg === 'bg-blue-900' ? 'bg-blue-500 text-blue-50' : stat.badgeBg + ' ' + stat.badgeText}`}>{stat.badgeLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>"""

content = content.replace(target_kpi, replacement_kpi)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
