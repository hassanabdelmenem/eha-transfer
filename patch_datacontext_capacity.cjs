const fs = require('fs');
let content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf8');

const interfaceTarget = "removeFacilityDepartment: (facilityId: string, department: string) => void;";
const interfaceNew = "removeFacilityDepartment: (facilityId: string, department: string) => void;\n  updateFacilityCapacity: (facilityId: string, capacities: Record<string, { total: number; occupied: number }>) => void;";
content = content.replace(interfaceTarget, interfaceNew);

const implTarget = "const removeFacilityDepartment = (facilityId: string, department: string) => {";
const implNew = `const updateFacilityCapacity = (facilityId: string, capacities: Record<string, { total: number; occupied: number }>) => {
    setFacilities(prev => prev.map(f => {
      if (f.id === facilityId) {
        return {
          ...f,
          capacity: {
            ...f.capacity,
            ...capacities
          }
        };
      }
      return f;
    }));
  };

  const removeFacilityDepartment = (facilityId: string, department: string) => {`;
content = content.replace(implTarget, implNew);

const exportTarget = "removeFacilityDepartment,";
const exportNew = "removeFacilityDepartment,\n      updateFacilityCapacity,";
content = content.replace(exportTarget, exportNew);

fs.writeFileSync('src/contexts/DataContext.tsx', content);
