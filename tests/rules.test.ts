import {test,expect} from 'vitest';
import {newCode,normalizeCode,during,sessionDigest} from '../lib/rules';
test('128-bit codes have four groups and normalize case',()=>{
  const codes=Array.from({length:500},newCode);
  expect(new Set(codes).size).toBe(codes.length);
  for(const code of codes) expect(normalizeCode(code.toLowerCase())).toBe(code);
  expect(normalizeCode('CXC-AAAA-BBBB-CCCC-DDDD')).toBeNull();
});
test('voting window includes opening and excludes closing',()=>{
  const opens_at=new Date('2026-01-01'), closes_at=new Date('2026-01-02');
  expect(during({opens_at,closes_at},opens_at)).toBe(true);
  expect(during({opens_at,closes_at},closes_at)).toBe(false);
  expect(sessionDigest('token')).toHaveLength(32);
});

