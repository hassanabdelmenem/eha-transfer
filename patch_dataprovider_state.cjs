const fs = require('fs');
let content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf8');

const targetState = `  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const { user } = useAuth();`;

const replacementState = `  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);`;

content = content.replace(targetState, replacementState);

const targetUseEffect = `  // Load from local storage if exists
  useEffect(() => {
    const savedUsers = localStorage.getItem('app_users');`;

const replacementUseEffect = `  // Sync offline data
  const syncOfflineData = async () => {
    try {
      const offlineReferrals = await getOfflineReferrals();
      if (offlineReferrals.length > 0) {
        // Add them to the state
        setReferrals(prev => {
          const newReferrals = [...offlineReferrals, ...prev];
          localStorage.setItem('app_referrals', JSON.stringify(newReferrals));
          return newReferrals;
        });
        
        // Notify
        offlineReferrals.forEach(ref => {
          if (ref.receivingFacilityId === 'auto' && ref.candidateFacilityIds) {
            ref.candidateFacilityIds.forEach(candidateId => {
              createNotification({
                title: \`New \${ref.priority.toUpperCase()} Referral (Auto-Routed - Synced)\`,
                message: \`Referral from \${facilities.find(f => f.id === ref.referringFacilityId)?.name || 'Facility'} for \${ref.receivingDepartments.join(', ')}\`,
                type: ref.priority === 'emergency' ? 'urgent' : 'info',
                referralId: ref.id,
                facilityId: candidateId,
                targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
                departments: ref.receivingDepartments
              });
            });
          } else {
            createNotification({
              title: \`New \${ref.priority.toUpperCase()} Referral (Synced)\`,
              message: \`Referral from \${facilities.find(f => f.id === ref.referringFacilityId)?.name || 'Facility'} for \${ref.receivingDepartments.join(', ')}\`,
              type: ref.priority === 'emergency' ? 'urgent' : 'info',
              referralId: ref.id,
              facilityId: ref.receivingFacilityId,
              targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
              departments: ref.receivingDepartments
            });
          }
        });

        // Clear offline DB
        for (const ref of offlineReferrals) {
          await deleteOfflineReferral(ref.id);
        }
        setPendingSyncCount(0);
      }
    } catch (err) {
      console.error('Error syncing offline referrals', err);
    }
  };

  useEffect(() => {
    const checkOfflineCount = async () => {
      const offlineReferrals = await getOfflineReferrals();
      setPendingSyncCount(offlineReferrals.length);
    };
    checkOfflineCount();

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load from local storage if exists
  useEffect(() => {
    const savedUsers = localStorage.getItem('app_users');`;

content = content.replace(targetUseEffect, replacementUseEffect);

fs.writeFileSync('src/contexts/DataContext.tsx', content);
