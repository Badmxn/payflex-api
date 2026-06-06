import { Request, Response } from 'express'
import prisma from '../prisma'

const calcFee = (amount: number) => Math.round(amount * 0.015)

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { recipient, email, amount, type, note } = req.body
    const userId = (req as any).user.id

    if (!recipient || !email || !amount || !type) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    if (amount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum amount is 100' })
    }

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
