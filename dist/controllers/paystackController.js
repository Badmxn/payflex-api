"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paystackWebhook = exports.verifyPayment = exports.initializePayment = void 0;
const https_1 = __importDefault(require("https"));
const prisma_1 = __importDefault(require("../prisma"));
const encryption_1 = require("../utils/encryption");
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const paystackRequest = (method, path, data) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path,
            method,
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json'
            }
        };
        const req = https_1.default.request(options, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        if (data)
            req.write(JSON.stringify(data));
        req.end();
    });
};
// Initialize a payment
const initializePayment = async (req, res) => {
    try {
        const { email, amount, transactionId } = req.body;
        const userId = req.user.id;
        if (!email || !amount || !transactionId) {
            return res.status(400).json({ success: false, message: 'Email, amount and transactionId are required' });
        }
        // Amount in kobo (Paystack uses kobo)
        const amountInKobo = Math.round(amount * 100);
        const response = await paystackRequest('POST', '/transaction/initialize', {
            email,
            amount: amountInKobo,
            metadata: {
                transactionId,
                userId
            },
            callback_url: `${process.env.FRONTEND_URL}/payment/verify`
        });
        if (!response.status) {
            return res.status(400).json({ success: false, message: response.message });
        }
        res.json({
            success: true,
            authorizationUrl: response.data.authorization_url,
            reference: response.data.reference,
            accessCode: response.data.access_code
        });
    }
    catch (error) {
        console.error('PAYSTACK INIT ERROR:', error);
        res.status(500).json({ success: false, message: 'Payment initialization failed' });
    }
};
exports.initializePayment = initializePayment;
// Verify a payment
const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.params;
        const response = await paystackRequest('GET', `/transaction/verify/${reference}`);
        if (!response.status || response.data.status !== 'success') {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
        const { transactionId } = response.data.metadata;
        // Update transaction status in database
        const transaction = await prisma_1.default.transaction.update({
            where: { id: transactionId },
            data: { status: 'success' }
        });
        res.json({
            success: true,
            message: 'Payment verified successfully',
            transaction: {
                ...transaction,
                recipient: (() => { try {
                    return (0, encryption_1.decrypt)(transaction.recipient);
                }
                catch {
                    return transaction.recipient;
                } })(),
                email: (() => { try {
                    return (0, encryption_1.decrypt)(transaction.email);
                }
                catch {
                    return transaction.email;
                } })()
            }
        });
    }
    catch (error) {
        console.error('PAYSTACK VERIFY ERROR:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};
exports.verifyPayment = verifyPayment;
// Paystack webhook
const paystackWebhook = async (req, res) => {
    try {
        const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
            .update(JSON.stringify(req.body))
            .digest('hex');
        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(400).json({ message: 'Invalid signature' });
        }
        const event = req.body;
        if (event.event === 'charge.success') {
            const { transactionId } = event.data.metadata;
            if (transactionId) {
                await prisma_1.default.transaction.update({
                    where: { id: transactionId },
                    data: { status: 'success' }
                });
            }
        }
        res.sendStatus(200);
    }
    catch (error) {
        console.error('WEBHOOK ERROR:', error);
        res.sendStatus(200);
    }
};
exports.paystackWebhook = paystackWebhook;
