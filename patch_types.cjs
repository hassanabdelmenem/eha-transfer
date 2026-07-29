const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');

const targetStr = "export interface ShiftAssignment {";
const newStr = `export interface ShiftLog {
  id: string;
  userId: string;
  userName: string;
  facilityId: string;
  department?: string;
  timestamp: string;
  pendingTransfersCount: number;
  admittedPatientsCount: number;
  summary: string;
}

export interface ShiftAssignment {`;

content = content.replace(targetStr, newStr);
fs.writeFileSync('src/types/index.ts', content);
