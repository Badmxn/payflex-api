"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const auditLog = (action) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            const userId = req.user?.id || null;
            const ip = req.ip || req.socket.remoteAddress || null;
            const userAgent = req.headers['user-agent'] || null;
            prisma_1.default.auditLog.create({
                data: {
                    userId,
                    action,
                    details: JSON.stringify({
                        method: req.method,
                        path: req.path,
                        status: res.statusCode,
                        success: body?.success
                    }),
                    ip,
                    userAgent
                }
            }).catch(err => console.error('AUDIT LOG ERROR:', err));
            return originalJson(body);
        };
        next();
    };
};
exports.auditLog = auditLog;
