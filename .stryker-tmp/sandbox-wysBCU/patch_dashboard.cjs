// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Insert departmentChartData calculation
const useMemoEnd = `    return data;\n  }, [facilityReferrals, user.facilityId]);`;
const newChartData = `    return data;
  }, [facilityReferrals, user.facilityId]);

  const departmentChartData = useMemo(() => {
    const deptMap = new Map<string, { name: string; incoming: number; outgoing: number; oneWay: number; serviceReturn: number; assessmentReturn: number }>();
    
    const getOrAdd = (dept: string) => {
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { name: dept, incoming: 0, outgoing: 0, oneWay: 0, serviceReturn: 0, assessmentReturn: 0 });
      }
      return deptMap.get(dept)!;
    };

    facilityReferrals.forEach(ref => {
      const isIncoming = ref.receivingFacilityId === user.facilityId || ref.receivingFacilityId === 'auto';
      const isOutgoing = ref.referringFacilityId === user.facilityId;

      const depts = ref.receivingDepartments && ref.receivingDepartments.length > 0 ? ref.receivingDepartments : ['Unspecified'];
      
      depts.forEach(dept => {
        const entry = getOrAdd(dept);
        if (isIncoming) entry.incoming++;
        if (isOutgoing) entry.outgoing++;

        const type = ref.transferType || 'one_way';
        if (type === 'one_way') entry.oneWay++;
        else if (type === 'service_and_return') entry.serviceReturn++;
        else if (type === 'assessment_with_return') entry.assessmentReturn++;
      });
    });

    return Array.from(deptMap.values()).sort((a, b) => (b.incoming + b.outgoing) - (a.incoming + a.outgoing));
  }, [facilityReferrals, user.facilityId]);`;

content = content.replace(useMemoEnd, newChartData);

// Now find where to insert the new charts
const chartsAreaTarget = `            </CardContent>
          </Card>
          
          <Card className="col-span-1 flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm">`;

const chartsAreaReplacement = `            </CardContent>
          </Card>

          <Card className="col-span-1 lg:col-span-2 flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm mt-6 lg:mt-0">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Department Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[300px]">
              <div className="h-[250px] w-full">
                <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-2">Volume by Department</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#0f172a' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="incoming" name="Incoming" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="outgoing" name="Outgoing" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[250px] w-full">
                <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-2">Referral Types by Department</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#0f172a' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="oneWay" name="One Way" fill="#64748b" stackId="a" />
                    <Bar dataKey="serviceReturn" name="Service/Return" fill="#8b5cf6" stackId="a" />
                    <Bar dataKey="assessmentReturn" name="Assessment" fill="#ec4899" stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1 flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm mt-6 lg:mt-0">`;

content = content.replace(chartsAreaTarget, chartsAreaReplacement);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
