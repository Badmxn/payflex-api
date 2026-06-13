import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma'

const transactionSchema = z.object({
  recipient: z.string().min(2, 'Recipient name is required'),
  email:     z.string().email('Invalid recipient email'),
  amount:    z.number().min(100, 'Minimum amount is 100'),
  type:      z.enum(['transfer', 'wallet', 'invoice']),
  note:      z.string().optional()
})

const calcFee = (amount: number) => Math.round(amount * 0.015)

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const result = transactionSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.issues[0].message
      })
    }

    const { recipient, email, amount, type, note } = result.data
    const userId = (req as any).user.id
    const fee = calcFee(amount)

    const transaction = await prisma.transaction.create({
      data: { recipient, email, amount, fee, type, note, userId, status: 'pending' }
    })

    res.status(201).json({
      success: true,
      message: 'Transaction created',
      transaction
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ success: true, transactions })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}
