import { Facility, BedType } from '../types';

export function getCandidateFacilities(
  facilities: Facility[],
  userFacilityId: string | undefined,
  receivingDepartments: string[],
  requiredBedType: BedType
): string[] {
  if (receivingDepartments.length === 0) return [];
  
  return facilities.filter(f => {
    // Basic checks: not the same facility, and has required departments
    const isDifferentFacility = f.id !== userFacilityId;
    const hasDepartments = receivingDepartments.every(d => f.departments.includes(d));
    
    // Bed availability check
    let hasAvailableBeds = true;
    if (f.capacity && f.capacity[requiredBedType]) {
      const beds = f.capacity[requiredBedType];
      hasAvailableBeds = (beds.total - beds.occupied) > 0;
    }

    return isDifferentFacility && hasDepartments && hasAvailableBeds;
  }).map(f => f.id);
}
