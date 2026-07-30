// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralDetailPage.tsx', 'utf8');

const targetStr = `<div className="flex flex-col gap-4 relative">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200" />
                
                <div className="relative flex gap-4">
                  <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{fromFacility?.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Origin</p>
                  </div>
                </div>

                <div className="relative flex gap-4">
                  <div className="z-10 rounded p-1.5 bg-slate-100 text-slate-400 ring-2 ring-white">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Transfer</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{referral.status === 'in_transit' ? 'Currently in transit' : 'Pending'}</p>
                  </div>
                </div>

                <div className="relative flex gap-4">
                  <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{toFacility?.name}</p>
                      {/* @ts-ignore */}
                      {toFacility?.isExternal && (
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 uppercase font-bold">External</span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Destination ({referral.requiredBedType})</p>
                  </div>
                </div>
              </div>`;

const replacementStr = `<div className="flex flex-col gap-4 relative">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200" />
                
                <div className="relative flex gap-4">
                  <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{fromFacility?.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Origin</p>
                  </div>
                </div>

                <div className="relative flex gap-4">
                  <div className="z-10 rounded p-1.5 bg-slate-100 text-slate-400 ring-2 ring-white">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Outbound Transfer</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{referral.status === 'in_transit' ? 'Currently in transit' : 'Pending'}</p>
                  </div>
                </div>

                <div className="relative flex gap-4">
                  <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{toFacility?.name}</p>
                      {/* @ts-ignore */}
                      {toFacility?.isExternal && (
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 uppercase font-bold">External</span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Destination ({referral.requiredBedType})</p>
                  </div>
                </div>

                {referral.transferType && referral.transferType !== 'one_way' && (
                  <>
                    <div className="relative flex gap-4">
                      <div className="z-10 rounded p-1.5 bg-slate-100 text-slate-400 ring-2 ring-white">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Return Transfer</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Pending Return</p>
                      </div>
                    </div>
                    
                    <div className="relative flex gap-4">
                      <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white">
                        <Building className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{fromFacility?.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Final Return</p>
                      </div>
                    </div>
                  </>
                )}
              </div>`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/pages/ReferralDetailPage.tsx', content);
