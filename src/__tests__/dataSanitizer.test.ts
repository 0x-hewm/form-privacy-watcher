import { DataSanitizer } from '../utils/dataSanitizer';

describe('DataSanitizer', () => {
  describe('sanitize', () => {
    test('should sanitize phone numbers', () => {
      const phone = '13812345678';
      const result = DataSanitizer.sanitize(phone);
      expect(result).toBe('138****5678');
    });

    test('should sanitize email addresses', () => {
      const email = 'test@example.com';
      const result = DataSanitizer.sanitize(email);
      expect(result).toBe('te***@example.com');
    });

    test('should sanitize ID cards', () => {
      const idCard = '110101199001011234';
      const result = DataSanitizer.sanitize(idCard);
      expect(result).toBe('110101********1234');
    });

    test('should sanitize credit cards', () => {
      const creditCard = '4111111111111111';
      const result = DataSanitizer.sanitize(creditCard);
      expect(result).toBe('4111 **** **** 1111');
    });

    test('should return *** for password type', () => {
      const password = 'mypassword123';
      const result = DataSanitizer.sanitize(password, 'password');
      expect(result).toBe('***');
    });

    test('should handle short strings', () => {
      const short = 'ab';
      const result = DataSanitizer.sanitize(short);
      expect(result).toBe('ab');
    });

    test('should sanitize general text', () => {
      const text = 'This is a long text string';
      const result = DataSanitizer.sanitize(text);
      expect(result).toBe('This ***tring');
    });
  });

  describe('isSensitive', () => {
    test('should detect phone field names as sensitive', () => {
      expect(DataSanitizer.isSensitive('phone')).toBe(true);
      expect(DataSanitizer.isSensitive('mobile')).toBe(true);
      expect(DataSanitizer.isSensitive('tel')).toBe(true);
    });

    test('should detect email field names as sensitive', () => {
      expect(DataSanitizer.isSensitive('email')).toBe(true);
      expect(DataSanitizer.isSensitive('mail')).toBe(true);
    });

    test('should detect password fields as sensitive', () => {
      expect(DataSanitizer.isSensitive('password')).toBe(true);
    });

    test('should detect tel fields as sensitive', () => {
      expect(DataSanitizer.isSensitive('tel')).toBe(true);
    });

    test('should not detect short strings as sensitive', () => {
      expect(DataSanitizer.isSensitive('ab')).toBe(false);
    });

    test('should not detect normal text as sensitive', () => {
      expect(DataSanitizer.isSensitive('normal')).toBe(false);
    });
  });

  describe('createHash', () => {
    test('should create consistent hashes', () => {
      const value = 'test value';
      const hash1 = DataSanitizer.createHash(value);
      const hash2 = DataSanitizer.createHash(value);
      expect(hash1).toBe(hash2);
    });

    test('should create different hashes for different values', () => {
      const hash1 = DataSanitizer.createHash('value1');
      const hash2 = DataSanitizer.createHash('value2');
      expect(hash1).not.toBe(hash2);
    });

    test('should be case insensitive', () => {
      const hash1 = DataSanitizer.createHash('Test');
      const hash2 = DataSanitizer.createHash('test');
      expect(hash1).toBe(hash2);
    });
  });

  describe('createPartialHash', () => {
    test('should create multiple hashes for different lengths', () => {
      const value = 'test12345678';
      const hashes = DataSanitizer.createPartialHash(value);
      expect(hashes.length).toBeGreaterThan(1);
      expect(hashes).toEqual(expect.arrayContaining([expect.any(String)]));
    });

    test('should handle short strings', () => {
      const value = 'test';
      const hashes = DataSanitizer.createPartialHash(value);
      expect(hashes.length).toBe(1);
    });
  });
});
