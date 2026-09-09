export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly expose: boolean;

  constructor(statusCode: number, code: string, message: string, expose = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.expose = expose;
  }
}

export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000;
}
