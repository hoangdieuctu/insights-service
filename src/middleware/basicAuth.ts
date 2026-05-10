import { Request, Response, NextFunction } from 'express'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if ((req.session as any).authenticated) {
    next()
    return
  }

  const isApi = req.path.startsWith('/api/')
  if (isApi) {
    res.status(401).json({ error: { message: 'Unauthorized' } })
  } else {
    const redirect = encodeURIComponent(req.originalUrl)
    res.redirect(`/login.html?redirect=${redirect}`)
  }
}
