import { Router } from 'express'
import { createTransaction, getTransactions } from '../controllers/transactionController'
import { protect } from '../middleware/auth'
import { fraudCheck } from '../middleware/fraudDetection'
import { auditLog } from '../middleware/audit'

const router = Router()

router.post('/', protect, fraudCheck, auditLog('TRANSACTION_CREATE'), createTransaction)
router.get('/', protect, auditLog('TRANSACTION_LIST'), getTransactions)

export default router
