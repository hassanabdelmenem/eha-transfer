import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { PatientCard } from '../components/referrals/PatientCard';
import { formatDateTime } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { VoiceTextarea } from '../components/ui/VoiceTextarea';
import { StatusTimeline } from '../components/referrals/StatusTimeline';
import { PrintableSummary } from '../components/referrals/PrintableSummary';
import { ArrowLeft, Printer, Check, X, Truck, Building, FileText, CheckCircle, AlertCircle, Copy, Download, Activity, ShieldAlert, Clock } from 'lucide-react';
import { ECGViewerOverlay } from '../components/referrals/ECGViewerOverlay';
import { Badge } from '../components/ui/Badge';
import { ReferralStatus, DeptApprovalStatus } from '../types';

export const ReferralDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { referrals, updateReferralStatus, overrideReferralDestination, toggleReferralEscalation, addDeptComment, facilities, shiftAssignments, users } = useData();
  const { user } = useAuth();
  
  const [notes, setNotes] = useState('');
  const [selectedECGUrl, setSelectedECGUrl] = useState<string | null>(null);
  const [deptCommentText, setDeptCommentText] = useState('');
  const [deptAction, setDeptAction] = useState<DeptApprovalStatus>('pending');
  const [copied, setCopied] = useState(false);
  const [overrideFacilityId, setOverrideFacilityId] = useState('');
  const [contractedFacilityId, setContractedFacilityId] = useState('');

  const referral = referrals.find(r => r.id === id);




  if (!referral || !user) {
    return <div className="p-8 text-center">Referral not found.</div>;
  }

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Clinical_Summary_${referral?.patientData?.name.replace(/\s+/g, '_')}`
  });

  const fromFacility = facilities.find(f => f.id === referral.referringFacilityId);
  const toFacility = referral.receivingFacilityId === 'auto' ? { name: 'Auto-Routed (Pending Destination)' } : facilities.find(f => f.id === referral.receivingFacilityId);
  const referringUser = users.find(u => u.id === referral.referringUserId);

  // Role checks
  const isAdmin = user.role === 'system_admin' || user.role === 'owner';
  const isReceiving = user.facilityId === referral.receivingFacilityId || (referral.receivingFacilityId === 'auto' && referral.candidateFacilityIds?.includes(user.facilityId || '')) || isAdmin;
  const isReferring = user.facilityId === referral.referringFacilityId || isAdmin;
  
  const isAssignedClinician = shiftAssignments?.some(s => 
    s.facilityId === user.facilityId && 
    referral.receivingDepartments.includes(s.department) &&
    s.assignedUserId === user.id
  );
  
  const isTargetDeptHead = isReceiving && (user.role === 'head_of_department' || user.role === 'owner' || (['consultant', 'specialist'].includes(user.role) && isAssignedClinician)) && (referral.receivingDepartments.includes(user.department || '') || isAdmin);
  const isFacilityManager = isReceiving && ['medical_director', 'hospital_manager', 'deputy_manager', 'owner'].includes(user.role);
  const isNurse = ['nurse', 'nursing_supervisor', 'owner'].includes(user.role);
  const isErRoom = (user.role === 'er_room' || user.role === 'owner') && (user.facilityId === referral.referringFacilityId || user.facilityId === referral.receivingFacilityId || (referral.receivingFacilityId === 'auto' && referral.candidateFacilityIds?.includes(user.facilityId || '')));

  
  const handleCopyId = () => {
    navigator.clipboard.writeText(referral.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusUpdate = (status: ReferralStatus) => {
    updateReferralStatus(referral.id, status, notes);
    setNotes('');
  };

  const submitDeptComment = () => {
    if (deptAction === 'pending') return;
    addDeptComment(referral.id, deptAction, deptCommentText);
    setDeptCommentText('');
    setDeptAction('pending');
  };

  const handleDestinationOverride = () => {
    if (overrideFacilityId) {
      overrideReferralDestination(referral.id, overrideFacilityId);
      setOverrideFacilityId('');
    }
  };

  return (
    <div className="space-y-6 pb-16 sm:pb-0 max-w-5xl mx-auto print:max-w-none print:pb-0 print:m-0 print:space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="print:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Referral Details</h1>
            
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">ID: {referral.id}</p>
              <button 
                onClick={handleCopyId}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors print:hidden"
                title="Copy ID"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant={referral.isEscalated ? "destructive" : "outline"}
            className={referral.isEscalated ? "bg-red-600 text-white hover:bg-red-700" : "bg-white dark:bg-slate-900"}
            onClick={() => toggleReferralEscalation(referral.id, !referral.isEscalated)}
          >
            <ShieldAlert className="h-4 w-4 mr-2" />
            {referral.isEscalated ? 'De-escalate' : 'Mark Escalated'}
          </Button>
          <Button 
            variant="outline" 
            className="bg-white dark:bg-slate-900"
            onClick={() => handlePrint()}
          >
            <Printer className="h-4 w-4 mr-2" />
            Generate PDF Summary
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {referral.isEscalated && (
            <div className="p-4 bg-red-600 text-white rounded-lg shadow-md flex items-center justify-between border-2 border-red-700">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 animate-pulse shrink-0" />
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">Escalated Referral (Priority Override)</h3>
                  <p className="text-xs text-red-100">System Admins can take direct actions (Approve, Decline, Postpone) regardless of department review.</p>
                </div>
              </div>
              <span className="text-[10px] bg-red-900 text-white font-bold px-2 py-1 rounded uppercase">Direct Action Enabled</span>
            </div>
          )}

          <PatientCard patient={referral.patientData} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-700" />
                Transfer Context & Extra Clinical Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Reason for Referral</p>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-slate-800 text-sm leading-relaxed">
                  {referral.reasonForReferral}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Referring Physician</p>
                  <p className="font-semibold text-slate-800">{referringUser?.name || 'Unknown'}</p>
                  {referringUser?.phoneNumber && (
                    <p className="text-xs text-slate-600 font-mono mt-0.5">📞 {referringUser.phoneNumber}</p>
                  )}
                  {referringUser?.email && (
                    <p className="text-xs text-slate-600 mt-0.5">✉️ {referringUser.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Target Department(s) / Bed</p>
                  <p className="font-semibold text-slate-800 uppercase">{referral.receivingDepartments.join(', ')} / {referral.requiredBedType}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Chief Complaint</p>
                   <p className="text-slate-800 text-sm">{referral.patientData.complaint || 'N/A'}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Presentation & HPI</p>
                   <p className="text-slate-800 text-sm">{referral.patientData.presentation || 'N/A'}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Past Medical History</p>
                   <p className="text-slate-800 text-sm">{referral.patientData.pastHistory || 'N/A'}</p>
                 </div>
              </div>
              
              {referral.patientData.medications && (
                <div className="text-sm mt-2">
                   <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Medications Received</p>
                   <p className="text-slate-800 text-sm">{referral.patientData.medications}</p>
                 </div>
              )}
              
              {referral.patientData.attachments && referral.patientData.attachments.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Clinical Attachments</p>
                  <div className="flex flex-wrap gap-4">
                    {referral.patientData.attachments.map(att => (
                      <div key={att.id} className="relative w-24 h-24 border border-slate-200 dark:border-slate-800 rounded overflow-hidden group bg-slate-50 dark:bg-slate-950">
                        {att.type === 'image' ? (
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <FileText className="w-8 h-8 mb-1" />
                            <span className="text-[8px] px-1 truncate w-full text-center">{att.name}</span>
                          </div>
                        )}
                        {att.type === 'image' ? (
                          <button
                            onClick={() => setSelectedECGUrl(att.url)}
                            className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Activity className="w-5 h-5 mb-1" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Quick View</span>
                          </button>
                        ) : (
                          <a 
                            href={att.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="w-5 h-5 mb-1" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Download</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Department Head Approval Section */}
          <Card>
            <CardHeader>
              <CardTitle>Department Reviews & Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {referral.deptComments.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">No department comments yet.</p>
              ) : (
                <div className="space-y-3">
                  {referral.deptComments.map(c => {
                    const commentUser = users.find(u => u.id === c.userId);
                    return (
                      <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{commentUser?.name} ({commentUser?.role.replace(/_/g, ' ')})</span>
                          <span className="text-[9px] text-slate-400 font-mono">{formatDateTime(c.timestamp)}</span>
                        </div>
                        <div className="mb-2">
                           <Badge variant={c.status === 'direct_approval' || c.status === 'urgent_approval' ? 'success' : c.status === 'requirements_needed' ? 'warning' : 'default'}>
                             {c.status.replace(/_/g, ' ')}
                           </Badge>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{c.comment}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {(isTargetDeptHead || isAdmin) && referral.status === 'pending' && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Add Department Review</h4>
                  <div className="grid grid-cols-2 gap-2">
                     <select className="rounded border border-slate-300 p-2 text-sm" value={deptAction} onChange={e => setDeptAction(e.target.value as DeptApprovalStatus)}>
                       <option value="pending" disabled>Select action...</option>
                       <option value="requirements_needed">Requirements Needed</option>
                       <option value="direct_approval">Direct Approval</option>
                       <option value="urgent_approval">Urgent Approval</option>
                       <option value="scheduled_approval">Scheduled Approval</option>
                       <option value="no_role">No Role / Not Indicated</option>
                     </select>
                  </div>
                  <VoiceTextarea
                    className="w-full rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                    placeholder="Clinical reasoning or requirements... (Click mic to dictate)"
                    value={deptCommentText}
                    onValueChange={setDeptCommentText}
                  />
                  <Button onClick={submitDeptComment} disabled={deptAction === 'pending'} className="w-full">Submit Review</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar / Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Journey</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 relative">
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
                      {toFacility && ('isExternal' in toFacility) && toFacility.isExternal && (
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
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-0 relative">
                <h4 className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-4">Timeline</h4>
                <StatusTimeline referral={referral} users={users} />
              </div>
            </CardContent>
          </Card>

          {/* Action Panel based on Role & Status */}
          
            <Card>
              <CardHeader className="bg-slate-900 rounded-t-lg border-b-0 pb-4">
                <CardTitle className="text-white">Facility Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                
                {referral.status === 'pending' && (
                   <div className="bg-amber-50 border border-amber-200 p-3 rounded text-amber-800 text-xs flex items-start gap-2 mb-4">
                     <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                     <span>Waiting for Department Head review before final Manager approval.</span>
                   </div>
                )}
  
                <div className="text-sm">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Action Notes (Optional)</label>
                  <VoiceTextarea
                    className="w-full rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    rows={2}
                    value={notes}
                    onValueChange={setNotes}
                    placeholder="Notes for status update... (Click mic to dictate)"
                  />
                </div>
  
                <div className="flex flex-col gap-2">
                  {/* System Admin Escalated Direct Actions Section */}
                  {isAdmin && ['pending', 'dept_approved', 'manager_approved', 'accepted', 'in_transit', 'arrived', 'postponed'].includes(referral.status) && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg space-y-3 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" /> System Admin Direct Actions
                        </span>
                        {referral.isEscalated && (
                          <span className="text-[9px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">Escalated</span>
                        )}
                      </div>

                      {/* Contracted Facility Transfer option on Approval */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                          Move/Transfer to Contracted Facility (Optional)
                        </label>
                        <select
                          className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                          value={contractedFacilityId}
                          onChange={(e) => setContractedFacilityId(e.target.value)}
                        >
                          <option value="">-- No Contracted Facility (Default Destination) --</option>
                          {facilities
                            .filter(f => f.id !== referral.referringFacilityId && (f.isExternal || f.type === 'external_contracted' || (f.contractedServices && f.contractedServices.length > 0)))
                            .map(f => (
                              <option key={f.id} value={f.id}>
                                🏥 {f.name} {f.contractedServices?.length ? `(${f.contractedServices.join(', ')})` : '(Contracted)'}
                              </option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <Button 
                          onClick={() => {
                            if (contractedFacilityId) {
                              overrideReferralDestination(referral.id, contractedFacilityId);
                            }
                            handleStatusUpdate('manager_approved');
                          }} 
                          className="bg-green-600 hover:bg-green-700 text-xs py-1.5 h-9"
                          title="Direct Approve Referral"
                        >
                          <CheckCircle className="h-3.5 h-3.5 mr-1 shrink-0" /> Approve
                        </Button>
                        <Button 
                          onClick={() => handleStatusUpdate('rejected')} 
                          variant="destructive" 
                          className="text-xs py-1.5 h-9"
                          title="Direct Decline Referral"
                        >
                          <X className="h-3.5 h-3.5 mr-1 shrink-0" /> Decline
                        </Button>
                        <Button 
                          onClick={() => handleStatusUpdate('postponed')} 
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs py-1.5 h-9"
                          title="Direct Postpone Referral"
                        >
                          <Clock className="h-3.5 h-3.5 mr-1 shrink-0" /> Postpone
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Standard Manager Final Approval (non-admin) */}
                  {!isAdmin && isFacilityManager && referral.status === 'dept_approved' && (
                    <>
                      <Button onClick={() => handleStatusUpdate('manager_approved')} className="w-full bg-blue-700 hover:bg-blue-800">
                        <CheckCircle className="h-4 w-4 mr-2" /> Manager Final Confirm
                      </Button>
                      <Button onClick={() => handleStatusUpdate('rejected')} variant="destructive" className="w-full">
                        <X className="h-4 w-4 mr-2" /> Reject Transfer
                      </Button>
                    </>
                  )}
                  
                  {/* Receiving Facility Actions post-approval */}
                  {isReceiving && !['nurse', 'nursing_supervisor'].includes(user.role) && referral.status === 'manager_approved' && (
                    <Button onClick={() => handleStatusUpdate('accepted')} className="w-full bg-green-600 hover:bg-green-700">
                      <Check className="h-4 w-4 mr-2" /> Ready for Receive (Accepted)
                    </Button>
                  )}
  
                  {(isReceiving || isErRoom) && referral.status === 'in_transit' && (
                    <Button onClick={() => handleStatusUpdate('arrived')} className="w-full bg-blue-600 hover:bg-blue-700">
                      Mark as Arrived
                    </Button>
                  )}
                  {isReceiving && referral.status === 'arrived' && (
                    <Button onClick={() => handleStatusUpdate('admitted')} className="w-full bg-emerald-600 hover:bg-emerald-700">
                      Admit Patient
                    </Button>
                  )}
                  {isReceiving && referral.status === 'admitted' && (
                    <Button onClick={() => handleStatusUpdate('discharged')} className="w-full bg-slate-600 hover:bg-slate-700">
                      Discharge Patient
                    </Button>
                  )}
  
                  {/* Referring Facility Actions */}
                  {(isReferring || isErRoom) && referral.status === 'accepted' && (
                    <Button onClick={() => handleStatusUpdate('in_transit')} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Truck className="h-4 w-4 mr-2" /> Dispatch Ambulance
                    </Button>
                  )}
  
                  {/* Generic state */}
                  {referral.status === 'admitted' && (
                    <Badge variant="success" className="w-full justify-center py-2 text-xs">Patient Admitted Successfully</Badge>
                  )}
                  {referral.status === 'discharged' && (
                    <Badge variant="default" className="w-full justify-center py-2 text-xs">Patient Discharged</Badge>
                  )}
                  {referral.status === 'rejected' && (
                    <Badge variant="danger" className="w-full justify-center py-2 text-xs">Referral Rejected</Badge>
                  )}
                  {referral.status === 'postponed' && (
                    <Badge variant="warning" className="w-full justify-center py-2 text-xs bg-amber-500 text-white">Referral Postponed</Badge>
                  )}
                  
                  {isAdmin && ['pending', 'dept_approved', 'manager_approved', 'accepted'].includes(referral.status) && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Admin Override Destination</label>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 rounded border border-slate-300 p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                          value={overrideFacilityId}
                          onChange={(e) => setOverrideFacilityId(e.target.value)}
                        >
                          <option value="">Select new destination...</option>
                          {facilities.filter(f => f.id !== referral.referringFacilityId).map(f => (
                            <option key={f.id} value={f.id}>{f.name} ({f.capacity[referral.requiredBedType]?.occupied || 0}/{f.capacity[referral.requiredBedType]?.total || 0} {referral.requiredBedType})</option>
                          ))}
                        </select>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          disabled={!overrideFacilityId}
                          onClick={handleDestinationOverride}
                        >
                          Override
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          
        </div>
      </div>

      {/* Hidden Printable Summary for react-to-print */}
      <div style={{ display: 'none' }}>
        <PrintableSummary ref={printRef} referral={referral} users={users} facilities={facilities} />
      </div>
    </div>
  );
};
