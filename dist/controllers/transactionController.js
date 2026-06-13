"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactions = exports.createTransaction = void 0;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../prisma"));
const transactionSchema = zod_1.z.object({
    recipient: zod_1.z.string().min(2, 'Recipient name is required'),
    email: zod_1.z.string().email('Invalid recipient email'),
    amount: zod_1.z.number().min(100, 'Minimum amount is 100'),
    type: zod_1.z.enum(['transfer', 'wallet', 'invoice']),
    note: zod_1.z.string().optional()
});
const calcFee = (amount) => Math.round(amount * 0.015);
const createTransaction = async (req, res) => {
    try {
        const result = transactionSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error.issues[0].message
            });
        }
        const { recipient, email, amount, type, note } = result.data;
        const userId = req.user.id;
        const fee = calcFee(amount);
        const transaction = await prisma_1.default.transaction.create({
            data: { recipient, email, amount, fee, type, note, userId, status: 'pending' }
        });
        res.status(201).json({
            success: true,
            message: 'Transaction created',
            transaction
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.createTransaction = createTransaction;
const getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const transactions = await prisma_1.default.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, transactions });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getTransactions = getTransactions;
