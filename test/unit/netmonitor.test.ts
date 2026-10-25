import { describe, expect, it } from 'vitest';
import { classify } from '@/lib/privacy/netmonitor';

const O = 'https://navira.example';
describe('network classification (Mode A must read 0 user-content requests)', () => {
  it('same-origin GET is an asset', () => expect(classify('/fonts/a.woff', 'GET', false, O)).toBe('asset'));
  it('model weights from the model host are disclosed separately', () => {
    expect(classify('https://huggingface.co/Xenova/whisper-tiny/resolve/main/x.onnx', 'GET', false, O)).toBe('modelWeights');
    expect(classify('https://cdn-lfs.hf.co/abc', 'GET', false, O)).toBe('modelWeights');
  });
  it('any POST, any body, or any other origin counts as possible user content', () => {
    expect(classify('/api', 'POST', true, O)).toBe('userContent');
    expect(classify('/x', 'GET', true, O)).toBe('userContent');
    expect(classify('https://evil.example/p?story=abc', 'GET', false, O)).toBe('userContent');
    expect(classify('https://huggingface.co/x', 'POST', true, O)).toBe('userContent');
  });
  it('lookalike hosts do not pass as the model host', () => {
    expect(classify('https://huggingface.co.evil.example/x', 'GET', false, O)).toBe('userContent');
  });
});
