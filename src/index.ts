import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import transactionRoutes from './routes/transactions'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'PayFlex API is running', version: '1.0.0' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
