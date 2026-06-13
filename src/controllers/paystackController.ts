import { Request, Response } from 'express'
import https from 'https'
import prisma from '../prisma'
import { decrypt } from '../utils/encryption'

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY as string

const paystackRequest = (method: string, path: string, data?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      }
    }

    const req = https.request(options, res => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resolve(JSON.parse(body)))
    })

    req.on('error', reject)
    if (data) req.write(JSON.stringify(data))
    req.end()
  })
}

// Initialize a payment
export const initializePayment = async (req: Request, res: Response) => {
  try {
    const { email, amount, transactionId } = req.body
    const userId = (req as any).user.id

    if (!email || !amount || !transactionId) {
      return res.status(400).json({ success: false, message: 'Email, amount and transactionId are required' })
    }

    // Amount in kobo (Paystack uses kobo)
    const amountInKobo = Math.round(amount * 100)

    const response = await paystackRequest('POST', '/transaction/initialize', {
      email,
      amount: amountInKobo,
      metadata: {
        transactionId,
        userId
      },
      callback_url: `${process.env.FRONTEND_URL}/payment/verify`
    })

    if (!response.status) {
      return res.status(400).json({ success: false, message: response.message })
    }

    res.json({
      success: true,
      authorizationUrl: response.data.authorization_url,
      reference: response.data.reference,
      accessCode: response.data.access_code
    })
  } catch (error) {
    console.error('PAYSTACK INIT ERROR:', error)
    res.status(500).json({ success: false, message: 'Payment initialization failed' })
  }
}

// Verify a payment
export const verifyPayment = async (req: Request, res: Response) => {
    try {
      const { reference } = req.params
  
      const response = await paystackRequest('GET', `/transaction/verify/${reference}`)
  
      if (!response.status) {
        return res.status(400).json({ success: false, message: 'Payment verification failed' })
      }
  
      const paymentData = response.data
  
      res.json({
        success: true,
        message: 'Payment verified successfully',
        payment: {
          reference: paymentData.reference,
          amount: paymentData.amount / 100,
          status: paymentData.status,
          email: paymentData.customer.email,
          paidAt: paymentData.paid_at,
          channel: paymentData.channel
        }
      })
    } catch (error) {
      console.error('PAYSTACK VERIFY ERROR:', error)
      res.status(500).json({ success: false, message: 'Payment verification failed' })
    }
  }

// Paystack webhook
export const paystackWebhook = async (req: Request, res: Response) => {
  try {
    const crypto = await import('crypto')
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex')

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).json({ message: 'Invalid signature' })
    }

    const event = req.body

    if (event.event === 'charge.success') {
      const { transactionId } = event.data.metadata
      if (transactionId) {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: { status: 'success' }
        })
      }
    }

    res.sendStatus(200)
  } catch (error) {
    console.error('WEBHOOK ERROR:', error)
    res.sendStatus(200)
  }
}