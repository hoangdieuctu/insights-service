import { Request, Response, NextFunction } from 'express'

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['authorization']
  if (header === `ApiKey ${process.env.INTERNAL_API_KEY}`) {
    next()
    return
  }
  res.status(401).json({ error: { message: 'Invalid or missing API key' } })
}
