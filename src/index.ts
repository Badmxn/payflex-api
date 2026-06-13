import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth'
import transactionRoutes from './routes/transactions'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Security headers
app.use(helmet())

// Rate limiting — max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' }
})

// Stricter limit for auth routes — max 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again later' }
})

app.use(cors())
app.use(express.json())
app.use(limiter)

// Routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/transactions', transactionRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'PayFlex API is running', version: '1.0.0' })
})

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
