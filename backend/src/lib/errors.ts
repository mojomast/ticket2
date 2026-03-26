export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;

  constructor(code: ErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'AppError';
  }

  static unauthorized(message = 'Non authentifie'): AppError {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Acces refuse'): AppError {
    return new AppError('FORBIDDEN', message, 403);
  }

  static notFound(message = 'Ressource introuvable'): AppError {
    return new AppError('NOT_FOUND', message, 404);
  }

  static badRequest(message: string): AppError {
    return new AppError('BAD_REQUEST', message, 400);
  }

  static conflict(message: string): AppError {
    return new AppError('CONFLICT', message, 409);
  }

  static validation(message: string): AppError {
    return new AppError('VALIDATION_ERROR', message, 400);
  }
}
