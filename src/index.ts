import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'PayFlex API is running', version: '1.0.0' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
