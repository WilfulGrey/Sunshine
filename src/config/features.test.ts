import { describe, it, expect } from 'vitest';
import { isHpProcessType, hpPrefillNote } from './features';

describe('features — HP process helpers', () => {
  it('isHpProcessType: true only for the 3 process types', () => {
    expect(isHpProcessType('pre_arrival')).toBe(true);
    expect(isHpProcessType('post_arrival')).toBe(true);
    expect(isHpProcessType('pre_departure')).toBe(true);
  });

  it('isHpProcessType: false for other types / undefined', () => {
    expect(isHpProcessType('general')).toBe(false);
    expect(isHpProcessType('interest')).toBe(false);
    expect(isHpProcessType('reapply')).toBe(false);
    expect(isHpProcessType(undefined)).toBe(false);
    expect(isHpProcessType('')).toBe(false);
  });

  it('hpPrefillNote: per-type note, empty for non-HP', () => {
    expect(hpPrefillNote('pre_arrival')).toContain('przyjazd');
    expect(hpPrefillNote('post_arrival')).toContain('pobyt');
    expect(hpPrefillNote('pre_departure')).toContain('wyjazd');
    expect(hpPrefillNote('general')).toBe('');
    expect(hpPrefillNote(undefined)).toBe('');
  });
});
