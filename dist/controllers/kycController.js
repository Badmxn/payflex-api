"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyKYC = exports.getKYCStatus = exports.submitKYC = void 0;
const zod_1 = require("zod");
const https_1 = __importDefault(require("https"));
const prisma_1 = __importDefault(require("../prisma"));
const encryption_1 = require("../utils/encryption");
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const kycSchema = zod_1.z.object({
    dateOfBirth: zod_1.z.string().min(8, 'Date of birth is required'),
    address: zod_1.z.string().min(5, 'Address is required'),
    idType: zod_1.z.enum(['bvn', 'nin']),
    idNumber: zod_1.z.string().min(10, 'ID number must be at least 10 digits').max(11)
});
const paystackRequest = (path) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path,
            method: 'GET',
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
        };
        const req = https_1.default.request(options, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.end();
    });
};
const submitKYC = async (req, res) => {
    try {
        const result = kycSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.error.issues[0].message });
        }
        const { dateOfBirth, address, idType, idNumber } = result.data;
        const userId = req.user.id;
        // Save KYC as pending — encrypt the ID number
        await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                dateOfBirth,
                address,
                idType,
                idNumber: (0, encryption_1.encrypt)(idNumber),
                kycStatus: 'pending',
                kycSubmittedAt: new Date()
            }
        });
        res.json({
            success: true,
            message: 'KYC submitted successfully. Verification in progress.',
            kycStatus: 'pending'
        });
    }
    catch (error) {
        console.error('KYC SUBMIT ERROR:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.submitKYC = submitKYC;
const getKYCStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                kycStatus: true,
                kycSubmittedAt: true,
                kycVerifiedAt: true,
                idType: true,
                dateOfBirth: true,
                address: true
            }
        });
        res.json({ success: true, kyc: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getKYCStatus = getKYCStatus;
// Simulated verification — in production this would call Paystack's identity verification
const verifyKYC = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user || user.kycStatus !== 'pending') {
            return res.status(400).json({ success: false, message: 'No pending KYC submission found' });
        }
        // In production: call Paystack BVN/NIN verification API here
        // For now, auto-approve after submission (test mode)
        await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                kycStatus: 'verified',
                kycVerifiedAt: new Date()
            }
        });
        res.json({ success: true, message: 'KYC verified successfully', kycStatus: 'verified' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.verifyKYC = verifyKYC;
