import bcrypt from 'bcryptjs';
import argon2 from 'argon2';

export const ARGON2ID_VERIFIER = {
  algorithm: 'argon2id' as const,
  version: 1,
  memoryKiB: 65536,
  timeCost: 3,
  parallelism: 1,
  outputBytes: 32,
};

export function calculatePasswordStrength(password: string): {
  score: number;
  level: 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  entropyBits: number;
  estimatedCrackTime: string;
} {
  if (!password) {
    return { score: 0, level: 'Weak', entropyBits: 0, estimatedCrackTime: 'Instant' };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  const length = password.length;
  const entropyBits = Math.round(length * Math.log2(Math.max(poolSize, 1)));

  let score = 0;
  if (entropyBits < 36) score = 20;
  else if (entropyBits < 55) score = 45;
  else if (entropyBits < 80) score = 75;
  else if (entropyBits < 100) score = 90;
  else score = 100;

  // Deduct penalty for obvious patterns or low length
  if (length < 8) score = Math.min(score, 30);
  if (/^(123|abc|password|qwerty)/i.test(password)) score = Math.min(score, 20);

  let level: 'Weak' | 'Medium' | 'Strong' | 'Very Strong' = 'Weak';
  if (score >= 85) level = 'Very Strong';
  else if (score >= 65) level = 'Strong';
  else if (score >= 40) level = 'Medium';

  // Estimate crack time
  let estimatedCrackTime = 'Instant';
  if (entropyBits > 100) estimatedCrackTime = 'Millions of Years';
  else if (entropyBits > 80) estimatedCrackTime = 'Thousands of Years';
  else if (entropyBits > 65) estimatedCrackTime = '320 Years';
  else if (entropyBits > 50) estimatedCrackTime = '12 Days';
  else if (entropyBits > 35) estimatedCrackTime = '3 Hours';
  else estimatedCrackTime = 'A Few Minutes';

  return { score, level, entropyBits, estimatedCrackTime };
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: ARGON2ID_VERIFIER.memoryKiB,
    timeCost: ARGON2ID_VERIFIER.timeCost,
    parallelism: ARGON2ID_VERIFIER.parallelism,
    hashLength: ARGON2ID_VERIFIER.outputBytes,
  });
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return bcrypt.compare(password, hash);
  }
  return argon2.verify(hash, password);
}
