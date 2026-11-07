/**
 * Copyright (c) 2026 SEVENSN / Ismailia Health Connect. All Rights Reserved.
 * Shared patient demographic validation and Egyptian National ID parser.
 * Parity with imc-er-manager patient demographics rules.
 */

// Arabic name allowing attached numbers for unknown patients ("مجهول 1", "مجهول الهوية 12")
export const ARABIC_NAME_REGEX = /^(?=.*[ء-ي؀-ۿ])[؀-ۿ\s0-9]+$/;

// Resilient Hospital ID: 2-30 chars, alphanumeric with hyphens/underscores, requires at least one digit
export const HOSPITAL_ID_REGEX = /^(?=.*\d)[A-Z0-9ء-ي][A-Z0-9ء-ي\-_]{0,28}[A-Z0-9ء-ي]$/;

export const NATIONAL_ID_REGEX = /^\d{14}$/;

/**
 * Normalizes Eastern Arabic (Arabic-Indic) and Persian digits to Latin digits.
 */
export function toLatinDigits(s: unknown): string {
  return String(s ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

/**
 * Validates whether a patient name is in Arabic script.
 * Supports attached numbers for unknown patients (e.g. "مجهول الهوية 1").
 */
export function isValidArabicName(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  const s = name.trim();
  return s.length > 0 && s.length <= 100 && ARABIC_NAME_REGEX.test(s);
}

/**
 * Checks if a name indicates an unidentified/unknown patient.
 */
export function isUnknownPatientName(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  const s = name.trim();
  return /^(مجهول|مجهولة|مجهول\s+الهوية|مجهولة\s+الهوية|unknown(\s+patient)?)/i.test(s);
}

/**
 * Formats a standardized unknown patient name with sequence number.
 */
export function formatUnknownPatientName(num = 1, isFemale = false): string {
  const prefix = isFemale ? 'مجهولة الهوية' : 'مجهول الهوية';
  return `${prefix} ${num}`;
}

/**
 * Detects if a hospital ID is a temporary emergency ID (e.g. UNK-101, TEMP-01).
 */
export function isTemporaryHospitalId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const s = id.trim().toUpperCase();
  return /^(UNK|TEMP|EMERG|UNKNOWN)[-_]/.test(s);
}

const BIDI_CLEAN_RE = new RegExp('[\\u200B\\u200E\\u200F\\u061C\\u2028\\u2029\\u202A-\\u202E\\u2060\\u2066-\\u2069\\uFEFF]', 'g');

/**
 * Validates hospital ID against universal regional health authority format.
 * Supports:
 * - Standard UHI: H123456789, A000000001
 * - Regional facility prefixes: IMC-8821, ABK-7023, FYD-4412, ISM-1, HID-001
 * - Pure numeric MRNs: 104928, 8821
 * - Temporary intake codes: UNK-101, TEMP-ER-001, EMERG-042
 * - Arabic-Indic numbers and slash-to-hyphen normalization
 */
export function isValidHospitalId(id: unknown): boolean {
  if (typeof id !== 'string' && typeof id !== 'number') return false;
  const s = toLatinDigits(String(id))
    .replace(BIDI_CLEAN_RE, '')
    .replace(/\//g, '-')
    .trim()
    .toUpperCase();
  return HOSPITAL_ID_REGEX.test(s);
}

/**
 * Validates 14-digit Egyptian National ID format. Optional/empty is valid unless required.
 */
export function isValidNationalId(nid: unknown): boolean {
  if (nid === null || nid === undefined || nid === '') return true;
  if (typeof nid !== 'string') return false;
  const s = nid.trim();
  return s === '' || NATIONAL_ID_REGEX.test(s);
}

/**
 * Normalizes Hospital ID for uniform dictionary lookup and deduplication.
 */
export function hospitalIdKey(v: unknown): string {
  return toLatinDigits(String(v ?? ''))
    .replace(BIDI_CLEAN_RE, '')
    .replace(/\s+/g, '')
    .replace(/\//g, '-')
    .toUpperCase();
}

/**
 * Folds Arabic letters, removes diacritics and tatweel for matching across referrals.
 * Parity with imc-er-manager referralKeyName().
 */
export function normalizeArabicName(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/[ً-ْٰ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[‎‏‪-‮⁦-⁩]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface DecodedNationalId {
  valid: boolean;
  age?: number;
  gender?: 'male' | 'female';
  birthDate?: Date;
  error?: string;
}

/**
 * Parses 14-digit Egyptian National ID to extract century, birthdate, age, and sex.
 * Implements strict calendar and age boundary validation.
 */
export function decodeNationalId(nid: string | null | undefined): DecodedNationalId {
  if (!nid) return { valid: false, error: 'empty' };
  const str = String(nid).trim();
  if (!NATIONAL_ID_REGEX.test(str)) {
    return { valid: false, error: 'invalid_format' };
  }

  // Century digit: '2' for 1900-1999, '3' for 2000-2099
  const centuryDigit = str[0];
  const century = centuryDigit === '2' ? 1900 : centuryDigit === '3' ? 2000 : 0;
  if (!century) return { valid: false, error: 'invalid_century' };

  const year = century + parseInt(str.slice(1, 3), 10);
  const month = parseInt(str.slice(3, 5), 10);
  const day = parseInt(str.slice(5, 7), 10);

  if (month < 1 || month > 12) return { valid: false, error: 'invalid_month' };
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return { valid: false, error: 'invalid_day' };

  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  if (birthDate > today) return { valid: false, error: 'future_birthdate' };

  let age = today.getFullYear() - year;
  const m = today.getMonth() - (month - 1);
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }

  if (age < 0 || age > 130) return { valid: false, error: 'invalid_age' };

  // 13th digit (index 12): odd = male, even = female
  const genderDigit = parseInt(str[12], 10);
  const gender: 'male' | 'female' = genderDigit % 2 !== 0 ? 'male' : 'female';

  return {
    valid: true,
    age,
    gender,
    birthDate,
  };
}

/**
 * Convenience helper extracting age and gender directly into patient demographic patches.
 */
export function decodeNationalIdToPatient(nid: string | null | undefined): { age?: number; gender?: 'male' | 'female' } {
  const res = decodeNationalId(nid);
  if (res.valid && res.age !== undefined && res.gender) {
    return { age: res.age, gender: res.gender };
  }
  return {};
}

export function validatePatientDemographics(
  { name, hospitalId, nationalId }: { name?: string; hospitalId?: string; nationalId?: string }
): { valid: boolean; errors: Partial<Record<'name' | 'hospitalId' | 'nationalId', string>> } {
  const errors: Partial<Record<'name' | 'hospitalId' | 'nationalId', string>> = {};

  if (name !== undefined && !isValidArabicName(name)) {
    errors.name = 'name_invalid';
  }
  if (hospitalId !== undefined && !isValidHospitalId(hospitalId)) {
    errors.hospitalId = 'hospital_id_invalid';
  }
  if (nationalId !== undefined && !isValidNationalId(nationalId)) {
    errors.nationalId = 'national_id_invalid';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ShiftPatientIdentityParams {
  verifiedNationalId: string;
  unifiedHospitalId: string;
  verifiedName?: string;
  staffEmail?: string;
}

/**
 * Reconciles a patient record with temporary/unknown identity to their permanent,
 * unified Hospital ID and National ID, appending an audit record into notes.
 */
export function shiftPatientIdentity<
  T extends {
    hospitalId?: string;
    patientId?: string;
    nationalId?: string;
    name?: string;
    notes?: string;
    [key: string]: unknown;
  }
>(
  currentPatient: T,
  { verifiedNationalId, unifiedHospitalId, verifiedName, staffEmail }: ShiftPatientIdentityParams
): Partial<T> & Record<string, unknown> {
  const prevId = currentPatient?.hospitalId || currentPatient?.patientId || '';
  const prevName = currentPatient?.name || '';
  const nowStr = new Date().toISOString();
  const staffTag = staffEmail ? ` by ${staffEmail}` : '';
  const auditLine = `[Identity Shift ${nowStr}${staffTag}: from ID "${prevId}" (${prevName}) to unified ID "${unifiedHospitalId}"]`;
  const existingNotes = currentPatient?.notes ? `${currentPatient.notes}\n${auditLine}` : auditLine;

  const patch: Record<string, unknown> = {
    hospitalId: unifiedHospitalId,
    nationalId: verifiedNationalId,
    notes: existingNotes,
    lastModified: nowStr,
  };

  if (currentPatient && 'patientId' in currentPatient) {
    patch.patientId = unifiedHospitalId;
  }

  if (verifiedName && verifiedName.trim()) {
    patch.name = verifiedName.trim();
  }

  return patch as Partial<T> & Record<string, unknown>;
}
