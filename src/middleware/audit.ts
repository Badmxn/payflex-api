import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma'

export const auditLog = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)

    res.json = (body: any) => {
      const userId = (req as any).user?.id || null
      const ip = req.ip || req.socket.remoteAddress || null
      const userAgent = req.headers['user-agent'] || null

      prisma.auditLog.create({
        data: {
          userId,
          action,
          details: JSON.stringify({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            success: body?.success
          }),
          ip,
          userAgent
        }
      }).catch(err => console.error('AUDIT LOG ERROR:', err))

      return originalJson(body)
    }

    next()
  }
}