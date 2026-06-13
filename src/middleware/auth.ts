import { Router } from 'express'
import { register, login, refresh, logout } from '../controllers/authController'
import { auditLog } from '../middleware/audit'

const router = Router()

router.post('/register', auditLog('USER_REGISTER'), register)
router.post('/login', auditLog('USER_LOGIN'), login)
router.post('/refresh', refresh)
router.post('/logout', auditLog('USER_LOGOUT'), logout)

export default router