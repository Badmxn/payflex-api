import { Router } from 'express'
import { initializePayment, verifyPayment, paystackWebhook } from '../controllers/paystackController'
import { protect } from '../middleware/auth'

const router = Router()

router.post('/initialize', protect, initializePayment)
router.get('/verify/:reference', protect, verifyPayment)
router.post('/webhook', paystackWebhook)

export default router
