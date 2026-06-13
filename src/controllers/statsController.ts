import { Request, Response } from 'express'
import prisma from '../prisma'
import { decrypt } from '../utils/encryption'

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Total sent this month
    const monthlyTotal = await prisma.transaction.aggregate({
      where: { userId, createdAt: { gte: startOfMonth }, status: 'success' },
      _sum: { amount: true, fee: true }
    })

    // Total transactions
    const totalCount = await prisma.transaction.count({ where: { userId } })

    // Success rate
    const successCount = await prisma.transaction.count({
      where: { userId, status: 'success' }
    })

    // Last 7 days daily breakdown
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'asc' }
    })

    // Group by day
    const dailyData: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const key = date.toISOString().slice(0, 10)
      dailyData[key] = 0
    }

    recentTransactions.forEach(tx => {
      const key = tx.createdAt.toISOString().slice(0, 10)
      if (dailyData[key] !== undefined) {
        dailyData[key] += tx.amount
      }
    })

    // Status breakdown
    const statusBreakdown = await prisma.transaction.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true }
    })

    // Recent transactions
    const recent = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const decryptedRecent = recent.map(tx => ({
      ...tx,
      recipient: (() => { try { return decrypt(tx.recipient) } catch { return tx.recipient } })(),
      email: (() => { try { return decrypt(tx.email) } catch { return tx.email } })()
    }))

    res.json({
      success: true,
      stats: {
        totalSentThisMonth: monthlyTotal._sum.amount || 0,
        totalFeesThisMonth: monthlyTotal._sum.fee || 0,
        totalTransactions: totalCount,
        successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
        dailyVolume: Object.entries(dailyData).map(([date, amount]) => ({ date, amount })),
        statusBreakdown: statusBreakdown.map(s => ({
          status: s.status,
          count: s._count.status
        })),
        recentTransactions: decryptedRecent
      }
    })
  } catch (error) {
    console.error('STATS ERROR:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}
