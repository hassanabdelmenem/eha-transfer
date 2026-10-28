import { describe, it, expect } from 'vitest';
import {
  isValidArabicName,
  isValidHospitalId,
  isValidNationalId,
  normalizeArabicName,
  decodeNationalId,
  decodeNationalIdToPatient,
  validatePatientDemographics,
  ARABIC_NAME_REGEX,
  HOSPITAL_ID_REGEX,
} from './validators';

describe('Patient Demographics Validators (IMC-ER parity)', () => {
  describe('isValidArabicName', () => {
    it('accepts valid Arabic patient names', () => {
      expect(isValidArabicName('أحمد محمد حسن')).toBe(true);
      expect(isValidArabicName('فاطمة الزهراء')).toBe(true);
      expect(isValidArabicName('ياسين عبد الرحمن')).toBe(true);
    });

    it('rejects English names or Latin characters', () => {
      expect(isValidArabicName('Ahmed Mohamed')).toBe(false);
      expect(isValidArabicName('John Doe')).toBe(false);
      expect(isValidArabicName('أحمد John')).toBe(false);
    });

    it('rejects numbers, symbols, and empty strings', () => {
      expect(isValidArabicName('')).toBe(false);
      expect(isValidArabicName('   ')).toBe(false);
      expect(isValidArabicName('أحمد 123')).toBe(false);
      expect(isValidArabicName('أحمد #')).toBe(false);
      expect(isValidArabicName(null)).toBe(false);
      expect(isValidArabicName(undefined)).toBe(false);
    });
  });

  describe('isValidHospitalId', () => {
    it('accepts valid 9-digit alphanumeric hospital IDs', () => {
      expect(isValidHospitalId('H123456789')).toBe(true);
      expect(isValidHospitalId('A000000001')).toBe(true);
      expect(isValidHospitalId('h123456789')).toBe(true); // normalizes to uppercase
    });

    it('rejects invalid hospital IDs', () => {
      expect(isValidHospitalId('')).toBe(false);
      expect(isValidHospitalId('123456789')).toBe(false);
      expect(isValidHospitalId('H123')).toBe(false);
      expect(isValidHospitalId('H1234567890')).toBe(false);
      expect(isValidHospitalId('HH12345678')).toBe(false);
      expect(isValidHospitalId(null)).toBe(false);
    });
  });

  describe('isValidNationalId', () => {
    it('allows empty or null when optional', () => {
      expect(isValidNationalId('')).toBe(true);
      expect(isValidNationalId(null)).toBe(true);
      expect(isValidNationalId(undefined)).toBe(true);
    });

    it('validates 14-digit format', () => {
      expect(isValidNationalId('29001011234557')).toBe(true);
      expect(isValidNationalId('12345')).toBe(false);
      expect(isValidNationalId('2900101123455A')).toBe(false);
    });
  });

  describe('normalizeArabicName', () => {
    it('folds alef, taa marbuta, and yaa while removing diacritics', () => {
      expect(normalizeArabicName('أَحْمَدُ')).toBe('احمد');
      expect(normalizeArabicName('إبراهيم')).toBe('ابراهيم');
      expect(normalizeArabicName('آمنة')).toBe('امنه');
      expect(normalizeArabicName('منى')).toBe('مني');
      expect(normalizeArabicName('فاطمة')).toBe('فاطمه');
    });
  });

  describe('decodeNationalId', () => {
    it('correctly parses 1900s Male National ID', () => {
      // 2 = 1900s, 90 = 1990, 01 = Jan, 01 = 1st, index 12 = 5 (odd => male)
      const res = decodeNationalId('29001011234557');
      expect(res.valid).toBe(true);
      expect(res.gender).toBe('male');
      expect(res.age).toBeGreaterThanOrEqual(36);
    });

    it('correctly parses 2000s Female National ID', () => {
      // 3 = 2000s, 05 = 2005, 06 = June, 15 = 15th, index 12 = 6 (even => female)
      const res = decodeNationalId('30506151234567');
      expect(res.valid).toBe(true);
      expect(res.gender).toBe('female');
      expect(res.age).toBeGreaterThanOrEqual(21);
    });

    it('rejects invalid century', () => {
      const res = decodeNationalId('19001011234557');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('invalid_century');
    });

    it('rejects invalid month and day', () => {
      expect(decodeNationalId('29013011234557').error).toBe('invalid_month');
      expect(decodeNationalId('29002311234557').error).toBe('invalid_day'); // Feb 31
    });

    it('rejects future birthdates', () => {
      // Century 3 (2000s), year 99 (2099)
      const res = decodeNationalId('39901011234557');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('future_birthdate');
    });

    it('extracts partial patient object via decodeNationalIdToPatient', () => {
      const patient = decodeNationalIdToPatient('29001011234557');
      expect(patient.gender).toBe('male');
      expect(patient.age).toBeGreaterThanOrEqual(36);

      const invalid = decodeNationalIdToPatient('invalid');
      expect(invalid).toEqual({});
    });
  });

  describe('validatePatientDemographics', () => {
    it('validates a complete demographic object', () => {
      const valid = validatePatientDemographics({
        name: 'أحمد محمود',
        hospitalId: 'H123456789',
        nationalId: '29001011234557',
      });
      expect(valid.valid).toBe(true);
      expect(valid.errors).toEqual({});
    });

    it('identifies invalid fields accurately', () => {
      const invalid = validatePatientDemographics({
        name: 'Invalid English Name',
        hospitalId: 'bad_id',
        nationalId: '123',
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.name).toBe('name_invalid');
      expect(invalid.errors.hospitalId).toBe('hospital_id_invalid');
      expect(invalid.errors.nationalId).toBe('national_id_invalid');
    });
  });
});
