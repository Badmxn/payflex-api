import { Request, Response } from 'express'
import https from 'https'

const fetchJson = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Rova-App' } }, res => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

let cache: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 60 * 1000

const COINS = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB']
const NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDT: 'Tether',
  USDC: 'USD Coin',
  BNB: 'BNB'
}

export const getCryptoPrices = async (req: Request, res: Response) => {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return res.json({ success: true, prices: cache.data, cached: true })
    }

    const symbols = COINS.join(',')
    const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbols}&tsyms=USD,NGN`
    const data = await fetchJson(url)

    console.log('CRYPTOCOMPARE RESPONSE:', JSON.stringify(data).slice(0, 500))

    const raw = data.RAW || {}

    const formatted = COINS.map(symbol => {
      const coin = raw[symbol]
      return {
        symbol,
        name: NAMES[symbol],
        usd: coin?.USD?.PRICE || null,
        ngn: coin?.NGN?.PRICE || null,
        change24h: coin?.USD?.CHANGEPCT24HOUR || null
      }
    })

    cache = { data: formatted, timestamp: Date.now() }

    res.json({ success: true, prices: formatted, cached: false })
  } catch (error) {
    console.error('CRYPTO PRICE ERROR:', error)
    if (cache) {
      return res.json({ success: true, prices: cache.data, cached: true, stale: true })
    }
    res.status(500).json({ success: false, message: 'Could not fetch crypto prices' })
  }
}
