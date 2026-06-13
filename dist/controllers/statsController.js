"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const encryption_1 = require("../utils/encryption");
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // Total sent this month
        const monthlyTotal = await prisma_1.default.transaction.aggregate({
            where: { userId, createdAt: { gte: startOfMonth }, status: 'success' },
            _sum: { amount: true, fee: true }
        });
        // Total transactions
        const totalCount = await prisma_1.default.transaction.count({ where: { userId } });
        // Success rate
        const successCount = await prisma_1.default.transaction.count({
            where: { userId, status: 'success' }
        });
        // Last 7 days daily breakdown
        const recentTransactions = await prisma_1.default.transaction.findMany({
            where: { userId, createdAt: { gte: sevenDaysAgo } },
            orderBy: { createdAt: 'asc' }
        });
        // Group by day
        const dailyData = {};
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const key = date.toISOString().slice(0, 10);
            dailyData[key] = 0;
        }
        recentTransactions.forEach(tx => {
            const key = tx.createdAt.toISOString().slice(0, 10);
            if (dailyData[key] !== undefined) {
                dailyData[key] += tx.amount;
            }
        });
        // Status breakdown
        const statusBreakdown = await prisma_1.default.transaction.groupBy({
            by: ['status'],
            where: { userId },
            _count: { status: true }
        });
        // Recent transactions
        const recent = await prisma_1.default.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        const decryptedRecent = recent.map(tx => ({
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
        res.json({
            success: true,
            stats: {
                totalSentThisMonth: monthlyTotal._sum.amount || 0,
                totalFeesThisMonth: monthlyTotal._sum.fee || 0,
                totalTransactions: totalCount,
                successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
                dailyVolume: Object.entries(dailyData).map(([date, amount]) => ({ date, amount })),
                statusBreakdown: statusBreakdown.map(s => ({
                    status: s.status,
                    count: s._count.status
                })),
                recentTransactions: decryptedRecent
            }
        });
    }
    catch (error) {
        console.error('STATS ERROR:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
