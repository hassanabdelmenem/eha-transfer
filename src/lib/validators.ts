/**
 * Copyright (c) 2026 SEVENSN / Ismailia Health Connect. All Rights Reserved.
 * Shared patient demographic validation and Egyptian National ID parser.
 * Parity with imc-er-manager patient demographics rules.
 */

export const ARABIC_NAME_REGEX = /^[؀-ۿ\s]+$/;
export const HOSPITAL_ID_REGEX = /^[A-Z]\d{9}$/;
export const NATIONAL_ID_REGEX = /^\d{14}$/;

/**
 * Validates whether a patient name is in Arabic script.
 */
export function isValidArabicName(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  const s = name.trim();
  return s.length > 0 && s.length <= 100 && ARABIC_NAME_REGEX.test(s);
}

/**
 * Validates hospital ID against standard Egyptian regional health authority format (e.g. H123456789).
 */
export function isValidHospitalId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const s = id.trim().toUpperCase();
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
