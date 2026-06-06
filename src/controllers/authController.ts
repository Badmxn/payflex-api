import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Temporary in-memory store (we'll replace with database in Phase 3)
const users: { id: string; name: string; email: string; password: string; role: string }[] = []

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body

    // Validate fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    // Check if user exists
    const existing = users.find(u => u.email === email)
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' })
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10)

    // Create user
    const user = {
      id: Date.now().toString(),
      name,
      email,
      password: hashed,
      role
    }
    users.push(user)

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

    // Find user
    const user = users.find(u => u.email === email)
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
