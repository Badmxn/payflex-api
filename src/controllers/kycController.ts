import { Request, Response } from 'express'
import { z } from 'zod'
import https from 'https'
import prisma from '../prisma'
import { encrypt } from '../utils/encryption'

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY as string

const kycSchema = z.object({
  dateOfBirth: z.string().min(8, 'Date of birth is required'),
  address:     z.string().min(5, 'Address is required'),
  idType:      z.enum(['bvn', 'nin']),
  idNumber:    z.string().min(10, 'ID number must be at least 10 digits').max(11)
})

const paystackRequest = (path: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path,
      method: 'GET',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    }
    const req = https.request(options, res => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resolve(JSON.parse(body)))
    })
    req.on('error', reject)
    req.end()
  })
}

export const submitKYC = async (req: Request, res: Response) => {
  try {
    const result = kycSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error.issues[0].message })
    }

    const { dateOfBirth, address, idType, idNumber } = result.data
    const userId = (req as any).user.id

    // Save KYC as pending — encrypt the ID number
    await prisma.user.update({
      where: { id: userId },
      data: {
        dateOfBirth,
        address,
        idType,
        idNumber: encrypt(idNumber),
        kycStatus: 'pending',
        kycSubmittedAt: new Date()
      }
    })

    res.json({
      success: true,
      message: 'KYC submitted successfully. Verification in progress.',
      kycStatus: 'pending'
    })
  } catch (error) {
    console.error('KYC SUBMIT ERROR:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const getKYCStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        kycStatus: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        idType: true,
        dateOfBirth: true,
        address: true
      }
    })

    res.json({ success: true, kyc: user })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Simulated verification — in production this would call Paystack's identity verification
export const verifyKYC = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user || user.kycStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending KYC submission found' })
    }

    // In production: call Paystack BVN/NIN verification API here
    // For now, auto-approve after submission (test mode)
    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'verified',
        kycVerifiedAt: new Date()
      }
    })

    res.json({ success: true, message: 'KYC verified successfully', kycStatus: 'verified' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}
