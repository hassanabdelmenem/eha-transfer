/**
 * Performance benchmarking suite for critical paths.
 * Run with: npm run bench
 * Measures before/after optimization impact.
 */

import { Referral, User, Facility, ShiftAssignment } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Synthetic data generators for scalability testing
export function generateMockFacilities(count: number): Facility[] {
  const facilityTypes: Array<Facility['type']> = ['primary_care', 'district_hospital', 'tertiary_care'];
  return Array.from({ length: count }, (_, i) => ({
    id: `f${i}`,
    name: `Hospital ${i}`,
    type: facilityTypes[i % facilityTypes.length],
    location: `Location ${i}`,
    departments: ['Emergency', 'ICU', 'Ward', 'Cardiology'].slice(0, (i % 4) + 1),
    capacity: {
      Ward: { total: 20 + i * 5, occupied: Math.floor((20 + i * 5) * 0.6) },
      ICU: { total: 10 + i * 2, occupied: Math.floor((10 + i * 2) * 0.7) },
      CCU: { total: 5, occupied: Math.floor(5 * 0.5) },
      PICU: { total: 4, occupied: 0 },
    },
  })) as Facility[];
}

export function generateMockUsers(count: number, facilitiesCount: number): User[] {
  const roles: Array<User['role']> = [
    'clinician', 'consultant', 'specialist', 'resident',
    'head_of_department', 'hospital_manager', 'medical_director', 'er_official'
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `u${i}`,
    name: `Dr. ${String.fromCharCode(65 + (i % 26))}${i}`,
    role: roles[i % roles.length],
    email: `user${i}@hospital.test`,
    phoneNumber: `01011112${String(i).padStart(3, '0')}`,
    facilityId: `f${i % facilitiesCount}`,
    department: ['Emergency', 'ICU', 'Cardiology', 'Surgery'][i % 4],
    verified: i % 10 !== 0,
  })) as User[];
}

export function generateMockReferrals(count: number, facilitiesCount: number, usersCount: number): Referral[] {
  const now = new Date();
  const priorities: Array<Referral['priority']> = ['emergency', 'urgent', 'routine'];
  return Array.from({ length: count }, (_, i) => {
    const referringFacilityId = `f${i % facilitiesCount}`;
    const receivingFacilityId = `f${(i + 1) % facilitiesCount}`;
    const referringUserId = `u${i % usersCount}`;
    return {
      id: `ref${i}`,
      patientId: `pat${i}`,
      patientData: {
        id: `pat${i}`,
        hospitalId: `H${String(i).padStart(6, '0')}`,
        name: `Patient ${i}`,
        age: 20 + (i % 70),
        gender: i % 2 === 0 ? 'male' : 'female',
        vitalSigns: {
          hr: 60 + Math.random() * 40,
          bp: `${110 + Math.random() * 30}/${70 + Math.random() * 20}`,
          spo2: 95 + Math.random() * 5,
          temp: 36.5 + Math.random() * 2,
          rr: 14 + Math.random() * 8,
          timestamp: now.toISOString(),
        },
        complaint: ['Chest pain', 'Shortness of breath', 'Head injury', 'Severe bleeding'][i % 4],
        presentation: 'Acute presentation',
        pastHistory: 'HTN, DM',
        medications: 'Aspirin',
        clinicalNotes: 'Critical condition',
        diagnosis: 'Pending',
        investigations: 'ECG pending',
        attachments: i % 5 === 0 ? [{ id: 'att1', name: 'ecg.png', type: 'image', url: 'http://example.com/ecg.png' }] : [],
      },
      referringFacilityId,
      referringUserId,
      receivingFacilityId,
      candidateFacilityIds: [receivingFacilityId],
      receivingDepartments: ['ICU', 'Emergency'],
      requiredBedType: 'ICU',
      priority: priorities[i % priorities.length] as Referral['priority'],
      status: ['pending', 'dept_approved', 'approved', 'in_transit', 'arrived'][i % 5] as any,
      reasonForReferral: 'Higher level of care needed',
      statusHistory: [{ status: 'pending', timestamp: now.toISOString(), userId: referringUserId, notes: 'Created' }],
      deptComments: [],
      createdAt: new Date(now.getTime() - i * 3600000).toISOString(),
      updatedAt: now.toISOString(),
    } as Referral;
  });
}

export function generateMockAssignments(count: number, facilitiesCount: number, usersCount: number): ShiftAssignment[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `s${i}`,
    facilityId: `f${i % facilitiesCount}`,
    department: ['Emergency', 'ICU', 'Cardiology'][i % 3],
    assignedUserId: `u${i % usersCount}`,
    updatedAt: new Date().toISOString(),
  }));
}

// Benchmark helpers
interface BenchmarkResult {
  name: string;
  operations: number;
  duration: number;
  opsPerSecond: number;
}

export function bench(name: string, fn: () => void, iterations: number = 1000): BenchmarkResult {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const duration = performance.now() - start;
  return {
    name,
    operations: iterations,
    duration,
    opsPerSecond: Math.round(iterations / (duration / 1000)),
  };
}

export function printResults(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(70));
  console.log('PERFORMANCE BENCHMARK RESULTS');
  console.log('='.repeat(70));
  results.forEach(r => {
    console.log(`\n${r.name}`);
    console.log(`  Operations: ${r.operations}`);
    console.log(`  Duration:   ${r.duration.toFixed(2)}ms`);
    console.log(`  Throughput: ${r.opsPerSecond} ops/sec`);
  });
  console.log('\n' + '='.repeat(70));
}

// Critical path benchmarks
export function benchmarkReferralLookup() {
  const facilities = generateMockFacilities(10);
  const users = generateMockUsers(50, 10);
  const referrals = generateMockReferrals(1000, 10, 50);

  // Setup maps (what we're testing)
  const referralsById = new Map(referrals.map(r => [r.id, r]));
  const usersById = new Map(users.map(u => [u.id, u]));

  const results: BenchmarkResult[] = [];

  // Linear scan (old way)
  results.push(
    bench('Referral Lookup - Array.find()', () => {
      referrals.find(r => r.id === 'ref500');
    }, 1000)
  );

  // Map lookup (new way)
  results.push(
    bench('Referral Lookup - Map.get()', () => {
      referralsById.get('ref500');
    }, 1000)
  );

  // User lookup (array)
  results.push(
    bench('User Lookup - Array.find()', () => {
      users.find(u => u.id === 'u25');
    }, 1000)
  );

  // User lookup (map)
  results.push(
    bench('User Lookup - Map.get()', () => {
      usersById.get('u25');
    }, 1000)
  );

  return results;
}

export function benchmarkPermissionChecks() {
  const facilities = generateMockFacilities(50);
  const users = generateMockUsers(200, 50);
  const referrals = generateMockReferrals(500, 50, 200);

  const usersById = new Map(users.map(u => [u.id, u]));

  // Setup: build HOD lookup map (what we're testing)
  const hodByFacilityAndDept = new Map<string, Map<string, any>>();
  users.forEach(u => {
    if (u.role === 'head_of_department' && u.facilityId && u.department) {
      if (!hodByFacilityAndDept.has(u.facilityId)) {
        hodByFacilityAndDept.set(u.facilityId, new Map());
      }
      hodByFacilityAndDept.get(u.facilityId)!.set(u.department, u);
    }
  });

  const results: BenchmarkResult[] = [];

  // Simulate permission check: find HOD for a given facility+dept
  results.push(
    bench('HOD Lookup - Nested Array.find()', () => {
      const targetFacilityId = 'f25';
      const targetDept = 'ICU';
      users.find(u =>
        u.facilityId === targetFacilityId &&
        u.department === targetDept &&
        u.role === 'head_of_department'
      );
    }, 500)
  );

  results.push(
    bench('HOD Lookup - Nested Map.get()', () => {
      const targetFacilityId = 'f25';
      const targetDept = 'ICU';
      hodByFacilityAndDept.get(targetFacilityId)?.get(targetDept);
    }, 500)
  );

  return results;
}

export function runAllBenchmarks() {
  console.log('\n📊 Running Performance Benchmarks...\n');
  
  const referralResults = benchmarkReferralLookup();
  printResults(referralResults);
  
  console.log('\n');
  
  const permissionResults = benchmarkPermissionChecks();
  printResults(permissionResults);

  // Calculate improvements
  const referralImprovement = referralResults[0].duration / referralResults[1].duration;
  const permissionImprovement = permissionResults[0].duration / permissionResults[1].duration;

  console.log('\n📈 IMPROVEMENT SUMMARY');
  console.log('='.repeat(70));
  console.log(`Referral lookups: ${referralImprovement.toFixed(1)}x faster with Map`);
  console.log(`Permission checks: ${permissionImprovement.toFixed(1)}x faster with nested Map`);
  console.log('='.repeat(70) + '\n');
}
