import { Router } from 'express'
import { createTransaction, getTransactions } from '../controllers/transactionController'
import { protect } from '../middleware/auth'

const router = Router()

router.post('/', protect, createTransaction)
router.get('/', protect, getTransactions)

export default router
