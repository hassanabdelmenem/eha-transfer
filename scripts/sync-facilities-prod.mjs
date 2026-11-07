#!/usr/bin/env node
// Syncs authentic Ismailia EHA network facilities and initial consultations
// to the production Firestore database (`eha-transfer-1785622025`).
import { execFileSync } from 'node:child_process';

const PROJECT = process.env.FIREBASE_PROJECT || 'eha-transfer-1785622025';
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'x-goog-user-project': PROJECT
};
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const enc = v =>
  v === null || v === undefined ? { nullValue: null }
  : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } }
  : { stringValue: String(v) };

async function call(url, init) {
  const res = await fetch(url, { headers, ...init });
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${url.replace(/\?.*/, '')}: ${res.status} ${await res.text()}`);
  return res.json();
}

const writeDoc = (collection, id, data) =>
  call(`${DOCS}/${collection}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])) })
  });

const FACILITIES = [
  {
    id: 'f1',
    name: 'Ismailia Medical Complex',
    nameAr: 'مجمع الإسماعيلية الطبي',
    type: 'tertiary_care',
    location: 'Ismailia City',
    locationAr: 'مدينة الإسماعيلية',
    departments: ['Emergency', 'ICU', 'Intermediate', 'CCU', 'PICU', 'NICU', 'Cardiology', 'Neurology', 'Surgery', 'Pediatrics', 'Internal Medicine', 'Nephrology', 'Orthopedics', 'Vascular Surgery', 'Neurosurgery', 'Cardiothoracic Surgery', 'Oncology', 'ENT', 'Ophthalmology', 'Maxillofacial', 'Radiology'],
    capacity: {
      ICU: { total: 17, occupied: 15 },
      Intermediate: { total: 39, occupied: 32 },
      CCU: { total: 21, occupied: 18 },
      PICU: { total: 11, occupied: 9 },
      NICU: { total: 27, occupied: 21 },
      Ward: { total: 212, occupied: 178 }
    }
  },
  {
    id: 'f2',
    name: 'Abu Khalifa Emergency Hospital',
    nameAr: 'مستشفى أبو خليفة للطوارئ والجراحات المتخصصة',
    type: 'tertiary_care',
    location: 'Abu Khalifa, Ismailia',
    locationAr: 'أبو خليفة - القنطرة غرب',
    departments: ['Emergency', 'ICU', 'Intermediate', 'Surgery', 'Orthopedics', 'Cardiothoracic Surgery', 'Vascular Surgery', 'Neurosurgery', 'Internal Medicine', 'Radiology'],
    capacity: {
      ICU: { total: 13, occupied: 11 },
      Intermediate: { total: 6, occupied: 5 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      NICU: { total: 0, occupied: 0 },
      Ward: { total: 95, occupied: 74 }
    }
  },
  {
    id: 'f3',
    name: 'Fayed Specialized Hospital',
    nameAr: 'مستشفى فايد التخصصي',
    type: 'district_hospital',
    location: 'Fayed',
    locationAr: 'مركز ومدينة فايد',
    departments: ['Emergency', 'ICU', 'Intermediate', 'NICU', 'Surgery', 'Orthopedics', 'Internal Medicine', 'Pediatrics', 'Obstetrics & Gynecology', 'Nephrology', 'Radiology'],
    capacity: {
      ICU: { total: 7, occupied: 6 },
      Intermediate: { total: 5, occupied: 4 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      NICU: { total: 12, occupied: 9 },
      Ward: { total: 47, occupied: 36 }
    }
  },
  {
    id: 'f4',
    name: 'El Qassasin Specialized Hospital',
    nameAr: 'مستشفى القصاصين التخصصي',
    type: 'district_hospital',
    location: 'El Qassasin',
    locationAr: 'مركز ومدينة القصاصين الجديدة',
    departments: ['Emergency', 'ICU', 'NICU', 'Surgery', 'Internal Medicine', 'Pediatrics', 'Nephrology', 'Obstetrics & Gynecology', 'Orthopedics', 'Radiology'],
    capacity: {
      ICU: { total: 15, occupied: 12 },
      Intermediate: { total: 0, occupied: 0 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      NICU: { total: 11, occupied: 8 },
      Ward: { total: 46, occupied: 35 }
    }
  },
  {
    id: 'f5',
    name: 'El Qantara West Hospital',
    nameAr: 'مستشفى القنطرة غرب المركزي',
    type: 'district_hospital',
    location: 'El Qantara West',
    locationAr: 'مدينة القنطرة غرب',
    departments: ['Emergency', 'ICU', 'Intermediate', 'NICU', 'Surgery', 'Internal Medicine', 'Orthopedics', 'Pediatrics', 'Obstetrics & Gynecology', 'Radiology'],
    capacity: {
      ICU: { total: 8, occupied: 6 },
      Intermediate: { total: 4, occupied: 3 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      NICU: { total: 5, occupied: 4 },
      Ward: { total: 50, occupied: 38 }
    }
  },
  {
    id: 'f6',
    name: 'El Qantara East Hospital',
    nameAr: 'مستشفى القنطرة شرق المركزي',
    type: 'district_hospital',
    location: 'El Qantara East',
    locationAr: 'مدينة القنطرة شرق',
    departments: ['Emergency', 'ICU', 'Intermediate', 'NICU', 'Surgery', 'Internal Medicine', 'Pediatrics', 'Obstetrics & Gynecology', 'Radiology'],
    capacity: {
      ICU: { total: 6, occupied: 5 },
      Intermediate: { total: 2, occupied: 2 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      NICU: { total: 4, occupied: 3 },
      Ward: { total: 36, occupied: 24 }
    }
  },
  {
    id: 'f7',
    name: 'Tel El Kebir Central Hospital',
    nameAr: 'مستشفى التل الكبير المركزي',
    type: 'district_hospital',
    location: 'Tel El Kebir',
    locationAr: 'مركز ومدينة التل الكبير',
    departments: ['Emergency', 'ICU', 'Intermediate', 'NICU', 'Surgery', 'Internal Medicine', 'Pediatrics', 'Obstetrics & Gynecology', 'Nephrology', 'Orthopedics', 'Radiology'],
    capacity: {
      ICU: { total: 10, occupied: 8 },
      Intermediate: { total: 6, occupied: 4 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      NICU: { total: 6, occupied: 4 },
      Ward: { total: 60, occupied: 45 }
    }
  },
  {
    id: 'f8',
    name: '30 June Nephrology & Urology Center',
    nameAr: 'مركز 30 يونيو الدولي لأمراض الكلى والمسالك البولية',
    type: 'tertiary_care',
    location: 'Ismailia City',
    locationAr: 'مدينة الإسماعيلية',
    departments: ['Emergency', 'ICU', 'Nephrology', 'Urology', 'Kidney Transplant', 'Hemodialysis', 'Surgery', 'Radiology'],
    capacity: {
      ICU: { total: 8, occupied: 6 },
      Intermediate: { total: 0, occupied: 0 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      NICU: { total: 0, occupied: 0 },
      Ward: { total: 44, occupied: 32 }
    }
  },
  {
    id: 'f9',
    name: 'Suez Canal University Hospital',
    nameAr: 'مستشفيات جامعة قناة السويس',
    type: 'external_contracted',
    isExternal: true,
    contractedServices: ['Toxicology', 'Neurosurgery', 'Pediatric Surgery', 'Vascular Surgery', 'Cardiothoracic Surgery'],
    location: 'Ismailia (University Campus)',
    locationAr: 'الإسماعيلية (المجمع الطبي الجامعي)',
    departments: ['Emergency', 'ICU', 'Intermediate', 'CCU', 'PICU', 'NICU', 'Neurosurgery', 'Cardiothoracic Surgery', 'Vascular Surgery', 'Pediatric Surgery', 'Toxicology'],
    capacity: {
      ICU: { total: 30, occupied: 28 },
      Intermediate: { total: 20, occupied: 18 },
      CCU: { total: 15, occupied: 14 },
      PICU: { total: 15, occupied: 12 },
      NICU: { total: 16, occupied: 14 },
      Ward: { total: 300, occupied: 270 }
    }
  },
  {
    id: 'f10',
    name: 'Suez Medical Complex',
    nameAr: 'مجمع السويس الطبي',
    type: 'tertiary_care',
    location: 'Suez Governorate',
    locationAr: 'محافظة السويس',
    departments: ['Emergency', 'ICU', 'Intermediate', 'CCU', 'PICU', 'NICU', 'Cardiology', 'Surgery', 'Burns & Plastic Surgery'],
    capacity: {
      ICU: { total: 45, occupied: 40 },
      Intermediate: { total: 25, occupied: 20 },
      CCU: { total: 20, occupied: 17 },
      PICU: { total: 20, occupied: 15 },
      NICU: { total: 24, occupied: 20 },
      Ward: { total: 350, occupied: 290 }
    }
  },
  {
    id: 'f11',
    name: 'Port Said Specialized Eye Hospital',
    nameAr: 'مستشفى رمد بورسعيد التخصصي',
    type: 'tertiary_care',
    location: 'Port Said Governorate',
    locationAr: 'محافظة بورسعيد',
    departments: ['Emergency', 'Ophthalmology', 'Surgery', 'ICU'],
    capacity: {
      ICU: { total: 4, occupied: 2 },
      Intermediate: { total: 2, occupied: 1 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      NICU: { total: 0, occupied: 0 },
      Ward: { total: 50, occupied: 30 }
    }
  }
];

const CONSULTATIONS = [
  {
    id: 'c-1',
    consultationNumber: '101',
    patientName: 'أحمد محمود إبراهيم',
    hospitalId: 'IMC-8821',
    nationalId: '28005120101123',
    age: 46,
    gender: 'male',
    specialty: 'Vascular Surgery',
    requestingHospital: 'مجمع الإسماعيلية الطبي',
    requestingHospitalId: 'f1',
    requestedHospital: 'مستشفى جامعة قناة السويس',
    requestedHospitalId: 'f9',
    reason: 'Acute lower limb ischemia with absent distal pulses, needs emergency revascularization vs embolectomy',
    urgency: 'emergency',
    status: 'pending',
    outcome: 'pending',
    isAnswered: false,
    requestedAt: new Date(Date.now() - 3600 * 1000).toISOString()
  },
  {
    id: 'c-2',
    consultationNumber: '102',
    patientName: 'سارة عبد الرحمن حسن',
    hospitalId: 'FYD-4412',
    nationalId: '29208250102456',
    age: 34,
    gender: 'female',
    specialty: 'Neurosurgery',
    requestingHospital: 'مستشفى فايد التخصصي',
    requestingHospitalId: 'f3',
    requestedHospital: 'مجمع الإسماعيلية الطبي',
    requestedHospitalId: 'f1',
    reason: 'Traumatic subarachnoid hemorrhage with depressed skull fracture GCS 12, urgent intervention evaluation',
    urgency: 'urgent',
    status: 'answered',
    outcome: 'indicated',
    doctorName: 'د. طارق العدوي (استشاري جراحة المخ والأعصاب)',
    responseNotes: 'الحالة تستدعي التدخل الجراحي العاجل لرفع الكسر وتفريغ النزيف. تم تأكيد قبول الحالة وتحويلها لقسم جراحة المخ والأعصاب بمجمع الإسماعيلية.',
    isAnswered: true,
    requestedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    answeredAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: 'c-3',
    consultationNumber: '103',
    patientName: 'محمود السيد علي',
    hospitalId: 'QAS-1930',
    nationalId: '26503150109988',
    age: 61,
    gender: 'male',
    specialty: 'Cardiology',
    requestingHospital: 'مستشفى القصاصين التخصصي',
    requestingHospitalId: 'f4',
    requestedHospital: 'مجمع الإسماعيلية الطبي',
    requestedHospitalId: 'f1',
    reason: 'Refractory unstable angina with ST depressions V3-V6 despite dual antiplatelets and nitrate infusion, urgent cath evaluation',
    urgency: 'urgent',
    status: 'answered',
    outcome: 'indicated',
    doctorName: 'د. هاني الشافعي (استشاري القلب والقسطرة)',
    responseNotes: 'الحالة مؤشرة لقسطرة قلبية عاجلة (Urgent Angiography & Primary PCI). سرير رعاية القلب (CCU) متاح وجاهز للاستقبال.',
    isAnswered: true,
    requestedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    answeredAt: new Date(Date.now() - 7 * 3600 * 1000).toISOString()
  },
  {
    id: 'c-4',
    consultationNumber: '104',
    patientName: 'مريم يوسف عثمان',
    hospitalId: 'ABK-7023',
    nationalId: '29811050106543',
    age: 28,
    gender: 'female',
    specialty: 'Toxicology',
    requestingHospital: 'مستشفى أبو خليفة للطوارئ',
    requestingHospitalId: 'f2',
    requestedHospital: 'مستشفى جامعة قناة السويس',
    requestedHospitalId: 'f9',
    reason: 'Organophosphate poisoning with respiratory secretions and bradycardia, advice on atropinization and pralidoxime regimen',
    urgency: 'urgent',
    status: 'answered',
    outcome: 'not_indicated',
    doctorName: 'د. دعاء رضوان (استشاري السموم الإكلينيكية)',
    responseNotes: 'تم إعطاء بروتوكول الأتروبين المطلوب ومتابعة التشبع الأكسجيني. لا يستدعي النقل الجغرافي حالياً مع استقرار العلامات الحيوية بالمستشفى.',
    isAnswered: true,
    requestedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    answeredAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString()
  }
];

async function main() {
  console.log(`Syncing authentic facilities to project: ${PROJECT}...`);
  for (const f of FACILITIES) {
    console.log(`  Writing facility ${f.id}: ${f.name} (${f.nameAr})...`);
    await writeDoc('facilities', f.id, f);
  }
  console.log(`Successfully synced ${FACILITIES.length} facilities.`);

  console.log(`Syncing initial consultations to project: ${PROJECT}...`);
  for (const c of CONSULTATIONS) {
    console.log(`  Writing consultation ${c.id}: ${c.patientName} (${c.specialty})...`);
    await writeDoc('consultations', c.id, c);
  }
  console.log(`Successfully synced ${CONSULTATIONS.length} consultations.`);
}

main().catch(err => {
  console.error('Failed to sync:', err);
  process.exit(1);
});
