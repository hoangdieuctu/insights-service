import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500
  const message = err.message ?? 'Internal Server Error'

  console.error(`[${req.method}] ${req.path} — ${statusCode}: ${message}`)
  if (statusCode === 500) console.error(err.stack)

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  })
}

export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message)
  err.statusCode = statusCode
  return err
}
