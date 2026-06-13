import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { sanitizeInput, hpp } from './middleware/sanitize'
import authRoutes from './routes/auth'
import transactionRoutes from './routes/transactions'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Trust Render's proxy
app.set('trust proxy', 1)

// Security headers
app.use(helmet())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again later' }
})

app.use(cors({
  origin: [
    'https://nn-five-ashy.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}))

app.use(express.json({ limit: '10kb' }))

// Prevent HTTP parameter pollution
app.use(hpp())

// Sanitize all inputs
app.use(sanitizeInput)

// Global rate limit
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
