// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const oldRecord = 'const data: Record<string, { name: string; admissions: number; referrals: number }[]> = {';
const newRecord = 'const data: Record<string, { name: string; incoming: number; outgoing: number; oneWay: number; serviceReturn: number; assessmentReturn: number }[]> = {';

content = content.replace(oldRecord, newRecord);

const oldCountData = `    const countData = (start: Date, end: Date) => {
      const a = facilityAdmissions.filter(x => new Date(x.createdAt) >= start && new Date(x.createdAt) <= end).length;
      const r = facilityReferrals.filter(x => new Date(x.createdAt) >= start && new Date(x.createdAt) <= end).length;
      return { admissions: a, referrals: r };
    };`;

const newCountData = `    const countData = (start: Date, end: Date) => {
      const relevant = facilityReferrals.filter(x => new Date(x.createdAt) >= start && new Date(x.createdAt) <= end);
      const incoming = relevant.filter(x => x.receivingFacilityId === user.facilityId || x.receivingFacilityId === 'auto').length;
      const outgoing = relevant.filter(x => x.referringFacilityId === user.facilityId).length;
      
      const oneWay = relevant.filter(x => !x.transferType || x.transferType === 'one_way').length;
      const serviceReturn = relevant.filter(x => x.transferType === 'service_and_return').length;
      const assessmentReturn = relevant.filter(x => x.transferType === 'assessment_with_return').length;
      
      return { incoming, outgoing, oneWay, serviceReturn, assessmentReturn };
    };`;

content = content.replace(oldCountData, newCountData);

const oldCardContent = `<CardContent className="flex-1 p-4 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicChartData[chartPeriod]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="admissions" name="Direct Admissions" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="referrals" name="Inbound Referrals" fill="#64748b" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>`;

const newCardContent = `<CardContent className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[300px]">
              <div className="h-[250px] w-full">
                <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-2">Volume (Incoming vs Outgoing)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicChartData[chartPeriod]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="incoming" name="Incoming" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="outgoing" name="Outgoing" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[250px] w-full">
                <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-2">Distribution by Type</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicChartData[chartPeriod]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="oneWay" name="One Way" fill="#64748b" stackId="a" />
                    <Bar dataKey="serviceReturn" name="Service/Return" fill="#8b5cf6" stackId="a" />
                    <Bar dataKey="assessmentReturn" name="Assessment" fill="#ec4899" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>`;

content = content.replace(oldCardContent, newCardContent);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
