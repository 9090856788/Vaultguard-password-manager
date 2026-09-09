import { AppError } from '../errors/AppError';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} is invalid.`);
  }
  return value.trim();
}

export function validateRegisterInput(body: unknown) {
  const input = body as Record<string, unknown>;
  const email = requireString(input.email, 'Email', 3, 320).toLowerCase();
  const password = requireString(input.password, 'Password', 8, 256);
  const fullName = requireString(input.fullName, 'Full name', 1, 160);
  if (!EMAIL_PATTERN.test(email)) throw new AppError(400, 'VALIDATION_ERROR', 'Email is invalid.');
  return { email, password, fullName };
}

export function validateLoginInput(body: unknown) {
  const input = body as Record<string, unknown>;
  const email = requireString(input.email, 'Email', 3, 320).toLowerCase();
  const password = requireString(input.password, 'Password', 1, 256);
  if (!EMAIL_PATTERN.test(email)) throw new AppError(400, 'VALIDATION_ERROR', 'Email is invalid.');
  return { email, password };
}

export function validateChangePasswordInput(body: unknown) {
  const input = body as Record<string, unknown>;
  return {
    currentPassword: requireString(input.currentPassword, 'Current password', 1, 256),
    newPassword: requireString(input.newPassword, 'New password', 8, 256),
  };
}
