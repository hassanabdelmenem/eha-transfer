import { describe, it, expect } from 'vitest';
import {
  isValidArabicName,
  isUnknownPatientName,
  formatUnknownPatientName,
  isTemporaryHospitalId,
  isValidHospitalId,
  isValidNationalId,
  hospitalIdKey,
  normalizeArabicName,
  decodeNationalId,
  decodeNationalIdToPatient,
  validatePatientDemographics,
  shiftPatientIdentity,
  toLatinDigits,
  ARABIC_NAME_REGEX,
  HOSPITAL_ID_REGEX,
} from './validators';

describe('Patient Demographics Validators (IMC-ER parity)', () => {
  describe('toLatinDigits', () => {
    it('converts Arabic-Indic and Persian digits to Latin digits', () => {
      expect(toLatinDigits('١٢٣٤٥٦٧٨٩٠')).toBe('1234567890');
      expect(toLatinDigits('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890');
      expect(toLatinDigits('H123')).toBe('H123');
    });
  });

  describe('isValidArabicName', () => {
    it('accepts valid Arabic patient names', () => {
      expect(isValidArabicName('أحمد محمد حسن')).toBe(true);
      expect(isValidArabicName('فاطمة الزهراء')).toBe(true);
      expect(isValidArabicName('ياسين عبد الرحمن')).toBe(true);
    });

    it('accepts unknown patient names with attached numbers', () => {
      expect(isValidArabicName('مجهول 1')).toBe(true);
      expect(isValidArabicName('مجهول الهوية 2')).toBe(true);
      expect(isValidArabicName('مجهولة 3')).toBe(true);
      expect(isValidArabicName('مجهولة الهوية 10')).toBe(true);
    });

    it('rejects English names or Latin characters', () => {
      expect(isValidArabicName('Ahmed Mohamed')).toBe(false);
      expect(isValidArabicName('John Doe')).toBe(false);
      expect(isValidArabicName('أحمد John')).toBe(false);
    });

    it('rejects pure numbers, symbols, and empty strings', () => {
      expect(isValidArabicName('')).toBe(false);
      expect(isValidArabicName('   ')).toBe(false);
      expect(isValidArabicName('12345')).toBe(false);
      expect(isValidArabicName('#@!')).toBe(false);
      expect(isValidArabicName(null)).toBe(false);
      expect(isValidArabicName(undefined)).toBe(false);
    });
  });

  describe('isUnknownPatientName & formatUnknownPatientName', () => {
    it('detects unknown patient variations in Arabic and English', () => {
      expect(isUnknownPatientName('مجهول')).toBe(true);
      expect(isUnknownPatientName('مجهول 1')).toBe(true);
      expect(isUnknownPatientName('مجهول الهوية 5')).toBe(true);
      expect(isUnknownPatientName('مجهولة')).toBe(true);
      expect(isUnknownPatientName('مجهولة الهوية 2')).toBe(true);
      expect(isUnknownPatientName('unknown')).toBe(true);
      expect(isUnknownPatientName('unknown patient')).toBe(true);
      expect(isUnknownPatientName('أحمد محمد')).toBe(false);
    });

    it('formats standardized unknown patient names', () => {
      expect(formatUnknownPatientName(1)).toBe('مجهول الهوية 1');
      expect(formatUnknownPatientName(2, true)).toBe('مجهولة الهوية 2');
    });
  });

  describe('isTemporaryHospitalId', () => {
    it('identifies emergency and temporary ID formats', () => {
      expect(isTemporaryHospitalId('UNK-101')).toBe(true);
      expect(isTemporaryHospitalId('unk_202')).toBe(true);
      expect(isTemporaryHospitalId('TEMP-01')).toBe(true);
      expect(isTemporaryHospitalId('EMERG-12')).toBe(true);
      expect(isTemporaryHospitalId('UNKNOWN-99')).toBe(true);
      expect(isTemporaryHospitalId('H123456789')).toBe(false);
      expect(isTemporaryHospitalId('IMC-8821')).toBe(false);
      expect(isTemporaryHospitalId('104928')).toBe(false);
    });
  });

  describe('isValidHospitalId', () => {
    it('accepts standard UHI (1 letter + 9 numbers)', () => {
      expect(isValidHospitalId('H123456789')).toBe(true);
      expect(isValidHospitalId('A000000001')).toBe(true);
      expect(isValidHospitalId('h123456789')).toBe(true); // normalizes to uppercase
    });

    it('accepts regional facility prefixes with alphanumeric codes', () => {
      expect(isValidHospitalId('IMC-8821')).toBe(true);
      expect(isValidHospitalId('ABK-7023')).toBe(true);
      expect(isValidHospitalId('FYD-4412')).toBe(true);
      expect(isValidHospitalId('ISM-1')).toBe(true);
      expect(isValidHospitalId('HID-001')).toBe(true);
      expect(isValidHospitalId('ER_001')).toBe(true);
    });

    it('accepts pure numeric MRNs', () => {
      expect(isValidHospitalId('104928')).toBe(true);
      expect(isValidHospitalId('8821')).toBe(true);
      expect(isValidHospitalId(104928)).toBe(true);
    });

    it('accepts temporary intake codes', () => {
      expect(isValidHospitalId('UNK-101')).toBe(true);
      expect(isValidHospitalId('TEMP-ER-001')).toBe(true);
      expect(isValidHospitalId('EMERG-042')).toBe(true);
    });

    it('normalizes slashes, Arabic-Indic digits, and bidi marks', () => {
      expect(isValidHospitalId('EHA/1042')).toBe(true); // converts / to -
      expect(isValidHospitalId('م١٢٣٤٥٦٧٨٩')).toBe(true);
      expect(isValidHospitalId('‎H123456789‏')).toBe(true);
    });

    it('rejects invalid hospital IDs', () => {
      expect(isValidHospitalId('')).toBe(false);
      expect(isValidHospitalId('1')).toBe(false); // single character
      expect(isValidHospitalId('bad')).toBe(false); // pure letters without digits
      expect(isValidHospitalId('TEST')).toBe(false);
      expect(isValidHospitalId('لا يوجد')).toBe(false);
      expect(isValidHospitalId('#123')).toBe(false); // invalid symbol
      expect(isValidHospitalId('A'.repeat(31))).toBe(false); // over 30 chars
      expect(isValidHospitalId(null)).toBe(false);
      expect(isValidHospitalId(undefined)).toBe(false);
    });
  });

  describe('hospitalIdKey', () => {
    it('generates consistent lookup keys', () => {
      expect(hospitalIdKey('imc-8821')).toBe('IMC-8821');
      expect(hospitalIdKey('EHA/1042')).toBe('EHA-1042');
      expect(hospitalIdKey(' H123456789 ')).toBe('H123456789');
      expect(hospitalIdKey('١٠٤٩٢٨')).toBe('104928');
    });
  });

  describe('shiftPatientIdentity', () => {
    it('reconciles temporary identity to unified National and Hospital IDs with audit notes', () => {
      const currentPatient = {
        hospitalId: 'UNK-101',
        patientId: 'UNK-101',
        name: 'مجهول الهوية 1',
        notes: 'Initial trauma assessment',
      };

      const patch = shiftPatientIdentity(currentPatient, {
        verifiedNationalId: '29001011234557',
        unifiedHospitalId: 'H123456789',
        verifiedName: 'أحمد محمد حسن',
        staffEmail: 'dr.ahmed@eha.gov.eg',
      });

      expect(patch.hospitalId).toBe('H123456789');
      expect(patch.patientId).toBe('H123456789');
      expect(patch.nationalId).toBe('29001011234557');
      expect(patch.name).toBe('أحمد محمد حسن');
      expect(patch.notes).toContain('Initial trauma assessment');
      expect(patch.notes).toContain('[Identity Shift');
      expect(patch.notes).toContain('from ID "UNK-101" (مجهول الهوية 1) to unified ID "H123456789"');
      expect(patch.notes).toContain('by dr.ahmed@eha.gov.eg');
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
    it('validates a complete demographic object with regional Hospital ID', () => {
      const valid = validatePatientDemographics({
        name: 'أحمد محمود',
        hospitalId: 'IMC-8821',
        nationalId: '29001011234557',
      });
      expect(valid.valid).toBe(true);
      expect(valid.errors).toEqual({});
    });

    it('validates unknown patient demographics', () => {
      const valid = validatePatientDemographics({
        name: 'مجهول الهوية 1',
        hospitalId: 'UNK-101',
      });
      expect(valid.valid).toBe(true);
      expect(valid.errors).toEqual({});
    });

    it('identifies invalid fields accurately', () => {
      const invalid = validatePatientDemographics({
        name: 'Invalid English Name',
        hospitalId: 'bad',
        nationalId: '123',
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.name).toBe('name_invalid');
      expect(invalid.errors.hospitalId).toBe('hospital_id_invalid');
      expect(invalid.errors.nationalId).toBe('national_id_invalid');
    });
  });
});
