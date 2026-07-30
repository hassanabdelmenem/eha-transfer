// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf8');

const targetAddReferral = `  const addReferral = (newReferralData: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'deptComments'>, sendCriticalAlert?: boolean) => {
    const now = new Date().toISOString();
    const newReferral: Referral = {
      ...newReferralData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      deptComments: [],
      statusHistory: [
        { status: newReferralData.status, timestamp: now, userId: newReferralData.referringUserId }
      ]
    };

    setReferrals(prev => [newReferral, ...prev]);

    // Generate notification for receiving facility managers/heads
    if (newReferral.receivingFacilityId === 'auto' && newReferral.candidateFacilityIds) {`;

const newAddReferral = `  const addReferral = (newReferralData: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'deptComments'>, sendCriticalAlert?: boolean) => {
    const now = new Date().toISOString();
    const newReferral: Referral = {
      ...newReferralData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      deptComments: [],
      statusHistory: [
        { status: newReferralData.status, timestamp: now, userId: newReferralData.referringUserId }
      ]
    };

    if (!isOnline) {
      saveOfflineReferral(newReferral).then(() => {
        setPendingSyncCount(prev => prev + 1);
      });
      // Optionally store in state too so user sees it right away locally
      setReferrals(prev => [newReferral, ...prev]);
      return;
    }

    setReferrals(prev => [newReferral, ...prev]);

    // Generate notification for receiving facility managers/heads
    if (newReferral.receivingFacilityId === 'auto' && newReferral.candidateFacilityIds) {`;

content = content.replace(targetAddReferral, newAddReferral);

fs.writeFileSync('src/contexts/DataContext.tsx', content);
