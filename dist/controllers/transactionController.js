"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactions = exports.createTransaction = void 0;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../prisma"));
const encryption_1 = require("../utils/encryption");
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
        // Encrypt sensitive fields before saving
        const transaction = await prisma_1.default.transaction.create({
            data: {
                recipient: (0, encryption_1.encrypt)(recipient),
                email: (0, encryption_1.encrypt)(email),
                amount,
                fee,
                type,
                note,
                userId,
                status: 'pending'
            }
        });
        // Decrypt before returning to client
        res.status(201).json({
            success: true,
            message: 'Transaction created',
            transaction: {
                ...transaction,
                recipient: (0, encryption_1.decrypt)(transaction.recipient),
                email: (0, encryption_1.decrypt)(transaction.email)
            }
        });
    }
    catch (error) {
        console.error('TRANSACTION ERROR:', error);
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
        // Decrypt all transactions before returning
        const decrypted = transactions.map(tx => ({
            ...tx,
            recipient: (() => { try {
                return (0, encryption_1.decrypt)(tx.recipient);
            }
            catch {
                return tx.recipient;
            } })(),
            email: (() => { try {
                return (0, encryption_1.decrypt)(tx.email);
            }
            catch {
                return tx.email;
            } })()
        }));
        res.json({ success: true, transactions: decrypted });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getTransactions = getTransactions;
