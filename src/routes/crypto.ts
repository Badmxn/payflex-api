import { Router } from 'express'
import { getCryptoPrices } from '../controllers/cryptoController'
import { protect } from '../middleware/auth'

const router = Router()

router.get('/prices', protect, getCryptoPrices)

export default router
