/**
 * VaultGuard Security & Cryptography Utilities
 * Provides entropy calculation, crack time estimation, password generator, and strength analysis.
 */

import { PasswordGeneratorOptions, PasswordStrength } from '../types';

export interface StrengthAnalysis {
  score: number; // 0 - 100
  level: PasswordStrength;
  entropyBits: number;
  crackTime: string;
  suggestions: string[];
  warnings: string[];
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSymbols: boolean;
  isCommon: boolean;
}

const COMMON_PASSWORDS = new Set([
  '123456', 'password', '123456789', '12345678', '12345', '1234567', '1234',
  'qwerty', '111111', '123123', 'admin', 'welcome', 'login', 'pass123', 'iloveyou',
  'master', 'secret', 'dragon', 'baseball', 'football', 'monkey', 'letmein'
]);

/**
 * Calculates entropy in bits based on character set pool size and length
 * Formula: E = L * log2(R)
 */
export function calculateEntropy(password: string): number {
  if (!password) return 0;
  
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33; // Symbols

  if (poolSize === 0) return 0;
  
  const entropy = password.length * (Math.log2(poolSize));
  return Math.round(entropy * 10) / 10;
}

/**
 * Estimates crack time based on entropy assuming 10^10 guesses/sec (modern hardware GPU clusters)
 */
export function estimateCrackTime(entropyBits: number): string {
  if (entropyBits <= 0) return 'Instant';
  
  // Total combinations = 2^(entropyBits)
  // Guesses per second = 10_000_000_000 (10 billion/sec)
  const combinations = Math.pow(2, entropyBits);
  const seconds = combinations / (2 * 10_000_000_000); // Average half search space

  if (seconds < 0.001) return 'Instant';
  if (seconds < 1) return 'Less than a second';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} hours`;
  
  const days = hours / 24;
  if (days < 365) return `${Math.round(days)} days`;
  
  const years = days / 365;
  if (years < 100) return `${Math.round(years)} years`;
  if (years < 1000) return `${Math.round(years / 100) * 100} years`;
  if (years < 1_000_000) return `${Math.round(years / 1000)}k years`;
  if (years < 1_000_000_000) return `${Math.round(years / 1_000_000)} million years`;
  
  return 'Trillions of years';
}

/**
 * Detailed password strength analyzer
 */
export function analyzePasswordStrength(password: string): StrengthAnalysis {
  if (!password) {
    return {
      score: 0,
      level: 'Weak',
      entropyBits: 0,
      crackTime: 'Instant',
      suggestions: ['Enter a password to evaluate strength'],
      warnings: [],
      hasUppercase: false,
      hasLowercase: false,
      hasNumbers: false,
      hasSymbols: false,
      isCommon: false,
    };
  }

  const length = password.length;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);
  const isCommon = COMMON_PASSWORDS.has(password.toLowerCase());

  const entropyBits = calculateEntropy(password);
  const crackTime = estimateCrackTime(entropyBits);

  const suggestions: string[] = [];
  const warnings: string[] = [];

  if (isCommon) {
    warnings.push('This password is in common breach databases!');
  }

  if (length < 8) {
    warnings.push('Password is critically short (under 8 characters)');
  } else if (length < 12) {
    suggestions.push('Increase length to at least 14-16 characters for maximum protection');
  }

  if (!hasUppercase) suggestions.push('Add uppercase letters (A-Z)');
  if (!hasLowercase) suggestions.push('Add lowercase letters (a-z)');
  if (!hasNumbers) suggestions.push('Add numbers (0-9)');
  if (!hasSymbols) suggestions.push('Add special symbols (!@#$%^&*)');

  // Sequential or repeating patterns check
  if (/(.)\1{2,}/.test(password)) {
    warnings.push('Avoid repeating characters (e.g. "aaa")');
  }
  if (/1234|qwerty|abcd|pass/i.test(password)) {
    warnings.push('Avoid sequential or keyboard patterns');
  }

  // Calculate score 0-100
  let score = 0;

  // Base score from entropy (up to 70 pts)
  score += Math.min(70, (entropyBits / 80) * 70);

  // Bonus points for length
  if (length >= 16) score += 15;
  else if (length >= 12) score += 10;
  else if (length >= 10) score += 5;

  // Variety bonus
  let typesCount = 0;
  if (hasUppercase) typesCount++;
  if (hasLowercase) typesCount++;
  if (hasNumbers) typesCount++;
  if (hasSymbols) typesCount++;

  score += typesCount * 3.75; // Up to 15 bonus

  // Deductions
  if (isCommon) score = Math.min(score, 15);
  if (length < 8) score = Math.min(score, 25);

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level: PasswordStrength = 'Weak';
  if (score >= 80) level = 'Very Strong';
  else if (score >= 60) level = 'Strong';
  else if (score >= 40) level = 'Medium';

  return {
    score,
    level,
    entropyBits,
    crackTime,
    suggestions,
    warnings,
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSymbols,
    isCommon,
  };
}

/**
 * Cryptographically strong random password generator
 */
export function generateSecurePassword(options: PasswordGeneratorOptions): string {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = false,
    excludeAmbiguous = false,
  } = options;

  let upperCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lowerCharset = 'abcdefghijklmnopqrstuvwxyz';
  let numberCharset = '0123456789';
  let symbolCharset = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (excludeSimilar) {
    // Remove i, l, 1, L, o, 0, O
    upperCharset = upperCharset.replace(/[IO]/g, '');
    lowerCharset = lowerCharset.replace(/[il1o]/g, '');
    numberCharset = numberCharset.replace(/[01]/g, '');
  }

  if (excludeAmbiguous) {
    // Remove brackets, slashes, quotes, tilde, semicolons
    symbolCharset = symbolCharset.replace(/[\{\}\[\]\(\)\/\'\"~,;\.<>]/g, '');
  }

  let fullCharset = '';
  const requiredChars: string[] = [];

  const getRandomChar = (charset: string) => {
    if (!charset) return '';
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return charset[array[0] % charset.length];
  };

  if (includeUppercase && upperCharset) {
    fullCharset += upperCharset;
    requiredChars.push(getRandomChar(upperCharset));
  }
  if (includeLowercase && lowerCharset) {
    fullCharset += lowerCharset;
    requiredChars.push(getRandomChar(lowerCharset));
  }
  if (includeNumbers && numberCharset) {
    fullCharset += numberCharset;
    requiredChars.push(getRandomChar(numberCharset));
  }
  if (includeSymbols && symbolCharset) {
    fullCharset += symbolCharset;
    requiredChars.push(getRandomChar(symbolCharset));
  }

  if (!fullCharset) {
    fullCharset = lowerCharset;
    requiredChars.push(getRandomChar(lowerCharset));
  }

  // Fill remaining length
  const remainingLength = Math.max(0, length - requiredChars.length);
  const randomChars: string[] = [];

  for (let i = 0; i < remainingLength; i++) {
    randomChars.push(getRandomChar(fullCharset));
  }

  // Combine and Fisher-Yates shuffle
  const allChars = [...requiredChars, ...randomChars];
  for (let i = allChars.length - 1; i > 0; i--) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const j = array[0] % (i + 1);
    [allChars[i], allChars[j]] = [allChars[j], allChars[i]];
  }

  return allChars.join('');
}

/**
 * Extracts clean domain or icon URL for a website
 */
export function getWebsiteFaviconUrl(websiteUrl: string): string {
  if (!websiteUrl) return '';
  try {
    let formatted = websiteUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'https://' + formatted;
    }
    const urlObj = new URL(formatted);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
  } catch {
    return '';
  }
}
