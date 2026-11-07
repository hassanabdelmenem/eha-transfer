import { Facility, User, Consultation } from '../types';

export const FACILITIES: Facility[] = [
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

export const MOCK_CONSULTATIONS: Consultation[] = [
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

// Placeholder seed roster, used only to populate an empty `users` collection on a
// brand-new project.
//
// These were previously real staff identities -- actual names, work email
// addresses and mobile numbers, including the owner's personal account. Because
// this module is imported at the top level of DataContext, every one of them was
// compiled into the JavaScript bundle served to any unauthenticated visitor of
// the hosting site: a ready-made phishing target list for the whole network,
// readable without signing in.
//
// Keep this file free of real identities. Real accounts are created by staff
// signing up and being verified by their facility leadership.
export const MOCK_USERS: User[] = [
  { id: 'u0', name: 'Owner (seed)', email: 'owner@example.invalid', role: 'owner' },
  { id: 'u_admin', name: 'System Admin (seed)', email: 'admin@example.invalid', role: 'system_admin' },
  { id: 'u1', name: 'Medical Director (seed)', email: 'director@example.invalid', role: 'medical_director', facilityId: 'f1' },
  { id: 'u2', name: 'Clinician (seed)', email: 'clinician@example.invalid', role: 'clinician', facilityId: 'f4', department: 'Emergency' },
  { id: 'u3', name: 'Head of Department (seed)', email: 'hod@example.invalid', role: 'head_of_department', facilityId: 'f1', department: 'Cardiology' },
  { id: 'u4', name: 'Nursing Supervisor (seed)', email: 'nursing@example.invalid', role: 'nursing_supervisor', facilityId: 'f2' },
  { id: 'u5', name: 'Hospital Manager (seed)', email: 'manager@example.invalid', role: 'hospital_manager', facilityId: 'f1' },
  { id: 'u6', name: 'ER Dispatch (seed)', email: 'er.f1@example.invalid', role: 'er_room', facilityId: 'f1' },
  { id: 'u7', name: 'ER Dispatch (seed)', email: 'er.f2@example.invalid', role: 'er_room', facilityId: 'f2' }
];
