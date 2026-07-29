const fs = require('fs');
let content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf8');

const importTarget = "export interface DirectAdmission {";
const importNew = "import { ShiftLog } from '../types';\n\nexport interface DirectAdmission {";
content = content.replace(importTarget, importNew);

const interfaceTarget = "shiftAssignments: ShiftAssignment[];";
const interfaceNew = "shiftAssignments: ShiftAssignment[];\n  shiftLogs: ShiftLog[];\n  addShiftLog: (log: Omit<ShiftLog, 'id' | 'timestamp'>) => void;";
content = content.replace(interfaceTarget, interfaceNew);

const stateTarget = "const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);";
const stateNew = "const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);\n  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);";
content = content.replace(stateTarget, stateNew);

const loadTarget = `    const savedShifts = localStorage.getItem('app_shifts');
    if (savedShifts) {
      setShiftAssignments(JSON.parse(savedShifts));
    }`;
const loadNew = `    const savedShifts = localStorage.getItem('app_shifts');
    if (savedShifts) {
      setShiftAssignments(JSON.parse(savedShifts));
    }
    const savedShiftLogs = localStorage.getItem('app_shift_logs');
    if (savedShiftLogs) {
      setShiftLogs(JSON.parse(savedShiftLogs));
    }`;
content = content.replace(loadTarget, loadNew);

const saveTarget = `  useEffect(() => {
    localStorage.setItem('app_shifts', JSON.stringify(shiftAssignments));
  }, [shiftAssignments]);`;
const saveNew = `  useEffect(() => {
    localStorage.setItem('app_shifts', JSON.stringify(shiftAssignments));
  }, [shiftAssignments]);

  useEffect(() => {
    localStorage.setItem('app_shift_logs', JSON.stringify(shiftLogs));
  }, [shiftLogs]);`;
content = content.replace(saveTarget, saveNew);

const methodTarget = "const addFacilityDepartment = (facilityId: string, department: string) => {";
const methodNew = `const addShiftLog = (logData: Omit<ShiftLog, 'id' | 'timestamp'>) => {
    const newLog: ShiftLog = {
      ...logData,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
    setShiftLogs(prev => [newLog, ...prev]);
  };

  const addFacilityDepartment = (facilityId: string, department: string) => {`;
content = content.replace(methodTarget, methodNew);

const exportTarget = "shiftAssignments,";
const exportNew = "shiftAssignments,\n      shiftLogs,\n      addShiftLog,";
content = content.replace(exportTarget, exportNew);

fs.writeFileSync('src/contexts/DataContext.tsx', content);
