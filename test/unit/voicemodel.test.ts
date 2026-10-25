import { describe, expect, it } from 'vitest';
import { defaultModel } from '@/lib/voice/transcribe';

describe('default speech model by device', () => {
  it('uses the small model on low-end devices', () => {
    expect(defaultModel({ hardwareConcurrency: 4, deviceMemory: 8 })).toBe('fast');
    expect(defaultModel({ hardwareConcurrency: 8, deviceMemory: 4 })).toBe('fast');
    expect(defaultModel({ hardwareConcurrency: 2 })).toBe('fast');
  });
  it('uses the better model on capable devices and when the browser does not report (e.g. desktop Safari)', () => {
    expect(defaultModel({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe('better');
    expect(defaultModel({})).toBe('better');
    expect(defaultModel(undefined)).toBe('better');
  });
});
