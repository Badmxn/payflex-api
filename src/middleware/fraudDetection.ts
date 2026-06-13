import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma'

const DAILY_LIMIT = 500000        // ₦500,000 per day
const SINGLE_LIMIT = 200000       // ₦200,000 per transaction
const HOURLY_TX_LIMIT = 10        // max 10 transactions per hour
const DUPLICATE_WINDOW = 5 * 60 * 1000  // 5 minutes

export const fraudCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, recipient, email } = req.body
    const userId = (req as any).user.id

    // 1. Single transaction limit
    if (amount > SINGLE_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Single transaction limit is ₦${SINGLE_LIMIT.toLocaleString()}
cat > src/middleware/fraudDetection.ts << 'EOF'
import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma'

const DAILY_LIMIT = 500000        // ₦500,000 per day
const SINGLE_LIMIT = 200000       // ₦200,000 per transaction
const HOURLY_TX_LIMIT = 10        // max 10 transactions per hour
const DUPLICATE_WINDOW = 5 * 60 * 1000  // 5 minutes

export const fraudCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, recipient, email } = req.body
    const userId = (req as any).user.id

    // 1. Single transaction limit
    if (amount > SINGLE_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Single transaction limit is ₦${SINGLE_LIMIT.toLocaleString()}`
      })
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const fiveMinutesAgo = new Date(now.getTime() - DUPLICATE_WINDOW)

    // 2. Daily limit check
    const dailyTotal = await prisma.transaction.aggregate({
      where: { userId, createdAt: { gte: startOfDay } },
      _sum: { amount: true }
    })

    const totalToday = (dailyTotal._sum.amount || 0) + amount
    if (totalToday > DAILY_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Daily transaction limit of ₦${DAILY_LIMIT.toLocaleString()} exceeded`
      })
    }

    // 3. Velocity check — too many transactions in one hour
    const recentCount = await prisma.transaction.count({
      where: { userId, createdAt: { gte: oneHourAgo } }
    })

    if (recentCount >= HOURLY_TX_LIMIT) {
      return res.status(400).json({
        success: false,
        message: 'Too many transactions. Please wait before trying again'
      })
    }

    // 4. Duplicate transaction check
    const duplicate = await prisma.transaction.findFirst({
      where: {
        userId,
        recipient,
        email,
        amount,
        createdAt: { gte: fiveMinutesAgo }
      }
    })

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate transaction detected. Please wait 5 minutes before retrying'
      })
    }

    next()
  } catch (error) {
    console.error('FRAUD CHECK ERROR:', error)
    next()
  }
}
