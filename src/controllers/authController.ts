import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../prisma'

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    // Check if user exists in database
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' })
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10)

    // Save user to database
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role }
    })

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Find user in database
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' })
    }

    // Check password
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' })
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}
