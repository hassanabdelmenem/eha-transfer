// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Insert departmentChartData calculation
const useMemoEnd = `    return data;\n  }, [facilityReferrals, facilityAdmissions]);`;
const newChartData = `    return data;
  }, [facilityReferrals, facilityAdmissions]);

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

fs.writeFileSync('src/pages/Dashboard.tsx', content);
