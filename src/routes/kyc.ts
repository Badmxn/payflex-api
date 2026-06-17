import { Router } from 'express'
import { submitKYC, getKYCStatus, verifyKYC } from '../controllers/kycController'
import { protect } from '../middleware/auth'

const router = Router()

router.post('/submit', protect, submitKYC)
router.get('/status', protect, getKYCStatus)
router.post('/verify', protect, verifyKYC)

export default router
