// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf8');

content = content.replace("const [shiftAssignments,\n      shiftLogs,\n      addShiftLog, setShiftAssignments] = useState<ShiftAssignment[]>([]);\n  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);", "const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);\n  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);");

content = content.replace("shiftAssignments,\n      addReferral,", "shiftAssignments,\n      shiftLogs,\n      addShiftLog,\n      addReferral,");

fs.writeFileSync('src/contexts/DataContext.tsx', content);
