"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCryptoPrices = void 0;
const https_1 = __importDefault(require("https"));
const COINS = 'bitcoin,ethereum,tether,usd-coin,binancecoin';
const fetchJson = (url) => {
    return new Promise((resolve, reject) => {
        https_1.default.get(url, { headers: { 'User-Agent': 'Rova-App' } }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                }
                catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
};
let cache = null;
const CACHE_DURATION = 60 * 1000; // 1 minute cache
const getCryptoPrices = async (req, res) => {
    try {
        if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
            return res.json({ success: true, prices: cache.data, cached: true });
        }
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COINS}&vs_currencies=usd,ngn&include_24hr_change=true`;
        const data = await fetchJson(url);
        console.log('COINGECKO RESPONSE:', JSON.stringify(data));
        const formatted = [
            { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', usd: data.bitcoin?.usd, ngn: data.bitcoin?.ngn, change24h: data.bitcoin?.usd_24h_change },
            { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', usd: data.ethereum?.usd, ngn: data.ethereum?.ngn, change24h: data.ethereum?.usd_24h_change },
            { id: 'tether', symbol: 'USDT', name: 'Tether', usd: data.tether?.usd, ngn: data.tether?.ngn, change24h: data.tether?.usd_24h_change },
            { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', usd: data['usd-coin']?.usd, ngn: data['usd-coin']?.ngn, change24h: data['usd-coin']?.usd_24h_change },
            { id: 'binancecoin', symbol: 'BNB', name: 'BNB', usd: data.binancecoin?.usd, ngn: data.binancecoin?.ngn, change24h: data.binancecoin?.usd_24h_change }
        ];
        cache = { data: formatted, timestamp: Date.now() };
        res.json({ success: true, prices: formatted, cached: false });
    }
    catch (error) {
        console.error('CRYPTO PRICE ERROR:', error);
        // Return cached data if available, even if stale
        if (cache) {
            return res.json({ success: true, prices: cache.data, cached: true, stale: true });
        }
        res.status(500).json({ success: false, message: 'Could not fetch crypto prices' });
    }
};
exports.getCryptoPrices = getCryptoPrices;
