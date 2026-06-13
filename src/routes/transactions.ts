import { Router } from 'express'
import { createTransaction, getTransactions } from '../controllers/transactionController'
import { protect } from '../middleware/auth'
import { fraudCheck } from '../middleware/fraudDetection'

const router = Router()

router.post('/', protect, fraudCheck, createTransaction)
router.get('/', protect, getTransactions)

export default router
