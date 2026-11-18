import type { Request, Response, NextFunction } from 'express'
import { isDev } from '../../env.ts'

export class APIError extends Error {
  status: number

  constructor(message: string, status: number = 500, name: string = 'APIError') {
    super(message)
    this.status = status
    this.name = name
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || 500
  const message = err.message || 'Internal Server Error'

  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message)

  res.status(status).json({
    error: {
      message,
      ...(isDev() && { stack: err.stack }),
    },
  })
}