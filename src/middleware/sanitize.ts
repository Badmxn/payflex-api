import { Request, Response, NextFunction } from 'express'
import xss from 'xss'
import hpp from 'hpp'

const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') return xss(obj)
  if (Array.isArray(obj)) return obj.map(sanitizeObject)
  if (obj && typeof obj === 'object') {
    const clean: any = {}
    for (const key of Object.keys(obj)) {
      clean[key] = sanitizeObject(obj[key])
    }
    return clean
  }
  return obj
}

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeObject(req.body)
  if (req.params) req.params = sanitizeObject(req.params)
  next()
}

export { hpp }
