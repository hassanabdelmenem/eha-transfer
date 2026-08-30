import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# 1. Add hodQueue definition
target_manager_queues = """  const managerEscalations = facilityReferrals.filter(r => 
    r.receivingFacilityId === user.facilityId &&
    r.isEscalated && 
    !['cancelled', 'rejected', 'discharged'].includes(r.status)
  );"""

replacement_hod_queue = """  const hodQueue = facilityReferrals.filter(r => 
    user.role === 'head_of_department' &&
    r.receivingFacilityId === user.facilityId &&
    user.department &&
    r.receivingDepartments?.includes(user.department) &&
    r.status === 'pending'
  );

  const activeDirectAdmissions = facilityAdmissions.filter(a => a.status === 'admitted');
  const activeReferralsAdmitted = facilityReferrals.filter(r => r.status === 'admitted');
""" + target_manager_queues

content = content.replace(target_manager_queues, replacement_hod_queue)

# 2. Modify the Quick Actions row to be a floating dock or just a better styled section
# Wait, let's just find the quick actions div:
# <div className={`flex items-center gap-2 px-4 py-3 border-t ${isManager ? 'border-white/10 bg-slate-950' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950'}`}>

quick_actions_target = """        <div className={`flex items-center gap-2 px-4 py-3 border-t ${isManager ? 'border-white/10 bg-slate-950' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950'}`}>
          {canCreateReferral && (
            <button
              onClick={() => navigate('/referrals/new')}
              className={`flex-1 min-h-[52px] rounded-lg text-sm font-bold   flex items-center justify-center gap-2 ${isManager ? 'bg-white text-slate-950' : 'bg-slate-950 dark:bg-white text-white dark:text-slate-900'}`}
            >
              <Plus className="w-4 h-4" /> New referral
            </button>
          )}
          <button
            onClick={() => navigate('/referrals')}
            aria-label="Search referrals"
            className={`h-[52px] w-[52px] shrink-0 rounded-lg border flex items-center justify-center ${isManager ? 'border-white/20 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/directory')}
            aria-label="Directory and hotline"
            className={`h-[52px] w-[52px] shrink-0 rounded-lg border flex items-center justify-center ${isManager ? 'border-white/20 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>"""

quick_actions_replacement = """        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-4 py-4 sm:px-6 border-t ${isManager ? 'border-white/10 bg-slate-950' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/50'}`}>
          {canCreateReferral && (
            <button
              onClick={() => navigate('/referrals/new')}
              className={`flex-1 min-h-[52px] rounded-xl shadow-sm text-sm font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] ${isManager ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600'}`}
            >
              <Plus className="w-5 h-5" /> Initiate New Referral
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/referrals')}
              className={`flex-1 sm:flex-none h-[52px] sm:w-[120px] rounded-xl border shadow-sm flex items-center justify-center gap-2 font-semibold text-sm transition-colors ${isManager ? 'border-white/20 text-white hover:bg-white/10' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}`}
            >
              <Search className="w-4 h-4" /> Search
            </button>
            <button
              onClick={() => navigate('/directory')}
              className={`flex-1 sm:flex-none h-[52px] sm:w-[120px] rounded-xl border shadow-sm flex items-center justify-center gap-2 font-semibold text-sm transition-colors ${isManager ? 'border-white/20 text-white hover:bg-white/10' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}`}
            >
              <Phone className="w-4 h-4" /> Directory
            </button>
          </div>
        </div>"""

content = content.replace(quick_actions_target, quick_actions_replacement)

# 3. Add Clinical/HoD widgets below the stats block
stats_end_target = """          </div>
        ))}
      </div>"""

expanded_clinical_widgets = """          </div>
        ))}
      </div>

      {/* Expanded Clinical Dashboard (Clinicians & HoDs) */}
      {!isManager && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Active Admissions List (for this user's department/facility) */}
          <Card className="flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Bed className="w-4 h-4 text-blue-500" /> Currently Admitted
                </CardTitle>
                <Badge variant="info">{(user.department ? activeDirectAdmissions.filter(a => a.department === user.department) : activeDirectAdmissions).length + (user.department ? activeReferralsAdmitted.filter(r => r.receivingDepartments?.includes(user.department || '')) : activeReferralsAdmitted).length} Total</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0 max-h-[300px]">
              {activeDirectAdmissions.length === 0 && activeReferralsAdmitted.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No patients currently admitted to your department.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeReferralsAdmitted.filter(r => !user.department || r.receivingDepartments?.includes(user.department)).map(r => (
                    <div key={r.id} onClick={() => navigate(`/referrals/${r.id}`)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{r.patientData.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{r.requiredBedType}</p>
                        </div>
                        <Badge variant="default" className="text-[10px] shrink-0">Referral</Badge>
                      </div>
                    </div>
                  ))}
                  {activeDirectAdmissions.filter(a => !user.department || a.department === user.department).map(a => (
                    <div key={a.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{a.patientName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">Direct Admission</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            {/* HoD Specific Queue */}
            {user.role === 'head_of_department' && (
              <Card className="flex flex-col border border-warning-200 dark:border-warning-900/50 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="border-b border-warning-100 dark:border-warning-900/30 py-3 bg-warning-50/50 dark:bg-warning-900/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-warning-800 dark:text-warning-400 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" /> Department Review Queue
                    </CardTitle>
                    {hodQueue.length > 0 && <Badge variant="warning">{hodQueue.length} Pending</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0 max-h-[150px]">
                  {hodQueue.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                      Your department queue is clear.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {hodQueue.map(r => (
                        <div key={r.id} onClick={() => navigate(`/referrals/${r.id}`)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex justify-between items-center">
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{r.patientData.name}</p>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Review &rarr;</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Shift Logs */}
            <Card className="flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900 flex-1">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-slate-500" /> Recent Shift Handovers
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0 max-h-[200px]">
                {recentShiftLogs.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No recent handovers in your department.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentShiftLogs.map(log => (
                      <div key={log.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.userName}</span>
                          <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{log.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}"""

content = content.replace(stats_end_target, expanded_clinical_widgets)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
