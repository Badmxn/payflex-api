import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import crypto from 'crypto'
import prisma from '../prisma'

const registerSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['buyer', 'seller'])
})

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

const generateAccessToken = (user: { id: string; email: string; role: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '15m' }
  )
}

const generateRefreshToken = () => crypto.randomBytes(64).toString('hex')

export const register = async (req: Request, res: Response) => {
  try {
    const result = registerSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.issues[0].message
      })
    }

    const { name, email, password, role } = result.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' })
    }

    // Strong bcrypt rounds
    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role }
    })

    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken()

    // Save refresh token to database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    console.error('REGISTER ERROR:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const result = loginSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.issues[0].message
      })
    }

    const { email, password } = result.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' })
    }

    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken()

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    console.error('LOGIN ERROR:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' })
    }

    // Find token in database
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    })

    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' })
    }

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { token: refreshToken } })

    const newAccessToken = generateAccessToken(stored.user)
    const newRefreshToken = generateRefreshToken()

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: stored.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
    }
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}
