import { describe, it, expect } from 'bun:test';
import {
  generateInviteCode,
  validateCodeFormat,
} from '../src/code-generator.js';

describe('code-generator', () => {
  it('should generate codes in AEON-XXXX-XXXX format', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^AEON-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it('should generate unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    expect(codes.size).toBe(100);
  });

  it('should not include ambiguous characters (I, O, 0, 1)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      const body = code.replace('AEON-', '').replace('-', '');
      expect(body).not.toMatch(/[IO01]/);
    }
  });

  it('should validate correct format', () => {
    expect(validateCodeFormat('AEON-ABCD-EFGH')).toBe(true);
    expect(validateCodeFormat('AEON-2345-6789')).toBe(true);
    expect(validateCodeFormat('AEON-AB2D-EF3H')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(validateCodeFormat('invalid')).toBe(false);
    expect(validateCodeFormat('AEON-ABCD')).toBe(false);
    expect(validateCodeFormat('AEON-ABCD-EFGH-IJKL')).toBe(false);
    expect(validateCodeFormat('aeon-abcd-efgh')).toBe(false);
    expect(validateCodeFormat('AEON-ABCI-EFGH')).toBe(false); // I is excluded
    expect(validateCodeFormat('AEON-ABC0-EFGH')).toBe(false); // 0 is excluded
    expect(validateCodeFormat('AEON-ABC1-EFGH')).toBe(false); // 1 is excluded
    expect(validateCodeFormat('AEON-ABCO-EFGH')).toBe(false); // O is excluded
  });
});
