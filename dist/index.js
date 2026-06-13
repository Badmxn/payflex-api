"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const sanitize_1 = require("./middleware/sanitize");
const auth_1 = __importDefault(require("./routes/auth"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const paystack_1 = __importDefault(require("./routes/paystack"));
const stats_1 = __importDefault(require("./routes/stats"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.set('trust proxy', 1);
app.use((0, helmet_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later' }
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many login attempts, please try again later' }
});
app.use((0, cors_1.default)({
    origin: [
        'https://nn-five-ashy.vercel.app',
        'http://localhost:5173'
    ],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10kb' }));
app.use((0, sanitize_1.hpp)());
app.use(sanitize_1.sanitizeInput);
app.use(limiter);
app.use('/api/auth', authLimiter, auth_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/paystack', paystack_1.default);
app.use('/api/stats', stats_1.default);
app.get('/', (req, res) => {
    res.json({ message: 'PayFlex API is running', version: '1.0.0' });
});
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
