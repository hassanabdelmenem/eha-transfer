const fs = require('fs');
let content = fs.readFileSync('src/pages/NewReferralPage.tsx', 'utf8');

content = content.replace("import { Upload, FileText, Image as ImageIcon, X } from 'lucide-react';", "import { Upload, FileText, Image as ImageIcon, X, Sparkles, Activity, Bed, Zap } from 'lucide-react';");

const targetState = `  const [sendCriticalAlert, setSendCriticalAlert] = useState(false);`;
const newState = `  const [sendCriticalAlert, setSendCriticalAlert] = useState(false);
  const [aiTriageRunning, setAiTriageRunning] = useState(false);
  const [aiRankedFacilities, setAiRankedFacilities] = useState<any[] | null>(null);

  const runAiTriage = () => {
    setAiTriageRunning(true);
    setAiRankedFacilities(null);
    setReceivingFacilityId('');
    setIsAutoRouting(false); // Disable simple auto route if using AI selection

    // Simulate AI processing
    setTimeout(() => {
      const ranked = availableFacilities.map(f => {
        const bedCap = f.capacity[requiredBedType] || { total: 0, occupied: 0 };
        const availableBeds = bedCap.total - bedCap.occupied;
        
        // Calculate a mock score (0-100) based on beds, and a random distance factor
        const randomDistance = Math.floor(Math.random() * 40) + 5; // 5km to 45km
        let score = 0;
        
        if (availableBeds > 5) score += 40;
        else if (availableBeds > 0) score += 20;
        else score -= 50; // Penalize full hospitals
        
        // Closer is better
        if (randomDistance < 15) score += 30;
        else if (randomDistance < 30) score += 15;
        
        // Priority match bonus
        if (priority === 'life_threatening') score += 20;

        // Specialized dept match
        score += receivingDepartments.length * 10;
        
        // Cap score
        score = Math.min(99, Math.max(12, score));
        
        let reason = '';
        if (availableBeds <= 0) reason = 'No beds available for required type.';
        else if (score > 80) reason = 'Optimal match based on immediate bed availability and close proximity.';
        else if (score > 60) reason = 'Good match with sufficient capacity.';
        else reason = 'Sub-optimal match due to distance or low capacity.';

        return { ...f, availableBeds, randomDistance, score, reason };
      }).sort((a, b) => b.score - a.score);
      
      setAiRankedFacilities(ranked);
      setAiTriageRunning(false);
      
      if (ranked.length > 0 && ranked[0].availableBeds > 0) {
        setReceivingFacilityId(ranked[0].id);
      }
    }, 1500);
  };
`;
content = content.replace(targetState, newState);

const targetSelect = `                {!isAutoRouting ? (
                  <select
                    required
                    className="w-full rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 disabled:opacity-50 bg-white dark:bg-slate-900"
                    value={receivingFacilityId}
                    onChange={e => setReceivingFacilityId(e.target.value)}
                    disabled={receivingDepartments.length === 0}
                  >
                    <option value="">Select Facility...</option>
                    {availableFacilities.map(f => {
                      // Show bed availability if applicable
                      let bedInfo = '';
                      if (requiredBedType && f.capacity[requiredBedType]) {
                         const cap = f.capacity[requiredBedType];
                         const avail = cap.total - cap.occupied;
                         bedInfo = \`(\${avail} \${requiredBedType} free)\`;
                      }
                      return (
                        <option key={f.id} value={f.id}>{f.name} {bedInfo}</option>
                      )
                    })}
                  </select>
                ) : (
                  <div className="w-full rounded border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-2 text-sm text-blue-800 dark:text-blue-300">
                    Will notify {availableFacilities.length} matching facilities automatically.
                  </div>
                )}`;

const newSelect = `                <div className="flex gap-2">
                  {!isAutoRouting && (
                    <select
                      required
                      className="w-full rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 disabled:opacity-50 bg-white dark:bg-slate-900"
                      value={receivingFacilityId}
                      onChange={e => setReceivingFacilityId(e.target.value)}
                      disabled={receivingDepartments.length === 0 || aiTriageRunning}
                    >
                      <option value="">Select Facility...</option>
                      {availableFacilities.map(f => {
                        let bedInfo = '';
                        if (requiredBedType && f.capacity[requiredBedType]) {
                           const cap = f.capacity[requiredBedType];
                           const avail = cap.total - cap.occupied;
                           bedInfo = \`(\${avail} \${requiredBedType} free)\`;
                        }
                        return (
                          <option key={f.id} value={f.id}>{f.name} {bedInfo}</option>
                        )
                      })}
                    </select>
                  )}
                  {isAutoRouting && (
                    <div className="w-full rounded border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-2 text-sm text-blue-800 dark:text-blue-300">
                      Will notify {availableFacilities.length} matching facilities automatically.
                    </div>
                  )}
                  
                  <Button 
                    type="button" 
                    onClick={runAiTriage} 
                    disabled={receivingDepartments.length === 0 || aiTriageRunning}
                    className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
                  >
                    {aiTriageRunning ? (
                      <Activity className="w-4 h-4 mr-2 animate-pulse" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    AI Triage
                  </Button>
                </div>
                
                {aiRankedFacilities && (
                  <div className="mt-4 space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">AI Ranked Destinations</h4>
                    </div>
                    {aiRankedFacilities.map((f, idx) => (
                      <div 
                        key={f.id} 
                        onClick={() => f.availableBeds > 0 && setReceivingFacilityId(f.id)}
                        className={\`p-3 rounded border transition-all \${f.availableBeds > 0 ? 'cursor-pointer hover:border-indigo-300' : 'opacity-60 cursor-not-allowed grayscale'} \${receivingFacilityId === f.id ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 ring-1 ring-indigo-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}\`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={\`text-xs font-bold px-2 py-0.5 rounded text-white \${idx === 0 ? 'bg-amber-500' : 'bg-slate-400'}\`}>#{idx + 1}</span>
                              <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{f.name}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{f.reason}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                              <Zap className="w-3 h-3 text-amber-500" />
                              Match: {f.score}%
                            </div>
                            <div className="flex items-center justify-end gap-2 text-[10px] text-slate-500">
                              <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" /> {f.availableBeds} free</span>
                              <span>•</span>
                              <span>~{f.randomDistance}km</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}`;

content = content.replace(targetSelect, newSelect);
fs.writeFileSync('src/pages/NewReferralPage.tsx', content);
