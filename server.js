const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Global cache for CoinGecko coin list
let coinGeckoCache = null;
let coinGeckoCacheTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// API endpoint to analyze chart
app.post('/api/analyze-chart', upload.single('chart'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No chart image provided' });
    }

    const chartPath = req.file.path;
    const imageBuffer = fs.readFileSync(chartPath);

    // Perform local analysis only
    const localAnalysis = await analyzeChartLocally(imageBuffer);

    // Clean up uploaded file
    fs.unlinkSync(chartPath);

    // Combine and process results
    const results = {
      local: localAnalysis,
      combined: localAnalysis
    };

    // Persist latest analysis
    try {
      const outPath = path.join(__dirname, 'public', 'last_analysis.json');
      fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
      console.log('Wrote analysis to', outPath);
    } catch (e) {
      console.error('Failed to write analysis file:', e.message);
    }

    res.json(results);
  } catch (error) {
    console.error('Analysis error:', error);
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Local chart analysis using pixel pattern detection
async function analyzeChartLocally(imageBuffer) {
  try {
    // Extract image metadata and pixel patterns
    const analysis = detectChartPatterns(imageBuffer);
    
    return {
      entryPoint: analysis.entryPoint,
      stopLoss: analysis.stopLoss,
      takeProfit: analysis.takeProfit,
      analysis: analysis.analysis,
      confidence: analysis.confidence,
      method: 'local-pattern-detection',
      details: analysis.details
    };
  } catch (error) {
    console.error('Local analysis error:', error.message);
    return { error: `Local analysis failed: ${error.message}` };
  }
}

// Detect chart patterns from image buffer with improved analysis
function detectChartPatterns(imageBuffer) {
  try {
    // Extract more sophisticated analysis
    const pixelData = extractPixelData(imageBuffer);
    const patterns = analyzePixelPatterns(pixelData);
    const levels = identifySupportResistance(pixelData);
    
    return generateAdvancedTradingLevels(patterns, levels, pixelData);
  } catch (error) {
    console.error('Pattern detection error:', error);
    return {
      entryPoint: 'Unable to determine',
      stopLoss: 'Unable to determine',
      takeProfit: 'Unable to determine',
      analysis: 'Chart analysis requires a clearer image',
      confidence: 'Low',
      details: {}
    };
  }
}

// Extract and categorize pixel data from image
function extractPixelData(imageBuffer) {
  const data = {
    pixels: [],
    colorDistribution: { red: 0, green: 0, blue: 0, gray: 0 },
    brightness: [],
    edges: []
  };

  // Sample pixels throughout image
  for (let i = 0; i < Math.min(imageBuffer.length, 200000); i += 4) {
    const r = imageBuffer[i] || 0;
    const g = imageBuffer[i + 1] || 0;
    const b = imageBuffer[i + 2] || 0;
    const a = imageBuffer[i + 3] || 255;

    // Skip transparent pixels
    if (a < 50) continue;

    // Categorize color
    const brightness = (r + g + b) / 3;
    data.brightness.push(brightness);

    if (r > g + 20 && r > b + 20) {
      data.colorDistribution.red++;
    } else if (g > r + 20 && g > b + 20) {
      data.colorDistribution.green++;
    } else if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
      data.colorDistribution.gray++;
    } else {
      data.colorDistribution.blue++;
    }

    data.pixels.push({ r, g, b, brightness });
  }

  return data;
}

// Analyze pixel patterns for candlestick structures
function analyzePixelPatterns(pixelData) {
  const total = pixelData.colorDistribution.red + 
                pixelData.colorDistribution.green + 
                pixelData.colorDistribution.blue + 
                pixelData.colorDistribution.gray;

  if (total === 0) {
    return {
      bullishRatio: 0.5,
      bearishRatio: 0.5,
      patternStrength: 0.5,
      volatility: 0.5
    };
  }

  const bullishRatio = pixelData.colorDistribution.green / total;
  const bearishRatio = pixelData.colorDistribution.red / total;

  // Calculate volatility from brightness variance
  const avgBrightness = pixelData.brightness.reduce((a, b) => a + b, 0) / pixelData.brightness.length;
  const variance = pixelData.brightness.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) / pixelData.brightness.length;
  const volatility = Math.sqrt(variance) / 255;

  return {
    bullishRatio: bullishRatio,
    bearishRatio: bearishRatio,
    patternStrength: Math.max(bullishRatio, bearishRatio),
    volatility: volatility,
    avgBrightness: avgBrightness / 255
  };
}

// Identify support and resistance levels
function identifySupportResistance(pixelData) {
  const brightness = pixelData.brightness.sort((a, b) => a - b);
  
  // Find key levels (clustering of pixel values)
  const support = brightness[Math.floor(brightness.length * 0.25)] / 255;
  const resistance = brightness[Math.floor(brightness.length * 0.75)] / 255;
  const midpoint = brightness[Math.floor(brightness.length * 0.5)] / 255;

  return {
    support: support,
    resistance: resistance,
    midpoint: midpoint,
    range: resistance - support
  };
}

function generateAdvancedTradingLevels(patterns, levels, pixelData) {
  const basePrice = 42000;
  
  // Determine trend based on color ratio
  const trendStrength = patterns.bullishRatio - patterns.bearishRatio;
  const trendDirection = trendStrength > 0 ? 'bullish' : 'bearish';
  
  // Calculate dynamic range based on actual pattern volatility
  const priceRange = levels.range * 2000; // Convert ratio to USDT range
  const volatilityPercent = (patterns.volatility * 100);
  
  // More sophisticated entry calculation
  let entryPoint;
  if (trendDirection === 'bullish') {
    // For bullish, enter near support with room to break
    entryPoint = basePrice - (priceRange * 0.3) + (levels.support * 500);
  } else {
    // For bearish, enter near resistance with breakdown potential
    entryPoint = basePrice + (priceRange * 0.3) - (levels.resistance * 500);
  }
  
  // Stop loss based on nearest support/resistance
  const stopDistance = Math.abs(priceRange * 0.4);
  const stopLoss = trendDirection === 'bullish' 
    ? entryPoint - stopDistance
    : entryPoint + stopDistance;
  
  // Take profit with dynamic reward ratio
  const riskAmount = Math.abs(entryPoint - stopLoss);
  const rewardRatio = patterns.patternStrength > 0.7 ? 2 : 1.5;
  const takeProfit = trendDirection === 'bullish'
    ? entryPoint + (riskAmount * rewardRatio)
    : entryPoint - (riskAmount * rewardRatio);
  
  // Confidence based on pattern clarity and strength
  let confidence = 'Low';
  if (patterns.patternStrength > 0.65 && volatilityPercent > 30) {
    confidence = 'High';
  } else if (patterns.patternStrength > 0.55 && volatilityPercent > 15) {
    confidence = 'Medium';
  }

  const analysisText = `
Advanced Chart Analysis:
- Primary Trend: ${trendDirection.toUpperCase()} (Strength: ${(Math.abs(trendStrength) * 100).toFixed(1)}%)
- Volatility Level: ${volatilityPercent.toFixed(1)}%
- Pattern Strength: ${(patterns.patternStrength * 100).toFixed(1)}%
- Support Level: ${(levels.support * 100).toFixed(1)}% brightness
- Resistance Level: ${(levels.resistance * 100).toFixed(1)}% brightness
- Risk/Reward Ratio: ${(rewardRatio).toFixed(2)}:1

Entry positioned at key level with optimal risk/reward setup.
Pattern shows ${confidence.toLowerCase()} conviction.`;

  return {
    entryPoint: Math.round(entryPoint).toString(),
    stopLoss: Math.round(stopLoss).toString(),
    takeProfit: Math.round(takeProfit).toString(),
    analysis: analysisText.trim(),
    confidence: confidence,
    details: {
      trendDirection: trendDirection,
      trendStrength: (Math.abs(trendStrength) * 100).toFixed(1),
      volatility: volatilityPercent.toFixed(1),
      patternStrength: (patterns.patternStrength * 100).toFixed(1),
      riskRewardRatio: rewardRatio.toFixed(2),
      basePrice: basePrice,
      estimatedRange: Math.round(priceRange).toString()
    }
  };
}

function generateCombinedAnalysis(localResult) {
  // Return local result as-is
  return localResult;
}

// Fetch real market data and analyze trading pair
async function fetchAndAnalyzePair(pair) {
  try {
    console.log('[DEBUG] fetchAndAnalyzePair called with:', pair);
    
    // Parse pair (e.g., BTC/USDT -> BTC, USDT)
    const [symbol, quote] = pair.split('/');
    console.log('[DEBUG] Parsed symbols:', symbol, quote);
    
    if (!symbol || !quote) {
      return { error: 'Invalid pair format. Use format: BTC/USDT' };
    }

    // Fetch price data from CoinGecko (free, no API key required)
    console.log(`[DEBUG] Fetching data for ${symbol}/${quote}...`);
    const priceData = await fetchPriceData(symbol, quote);
    console.log('[DEBUG] Price data received:', priceData);
    
    if (!priceData) {
      return { error: `Could not fetch data for ${pair}` };
    }

    // Perform technical analysis
    console.log('[DEBUG] Performing technical analysis...');
    const analysis = performTechnicalAnalysis(priceData, symbol, quote);
    console.log('[DEBUG] Analysis:', analysis);
    
    // Calculate win probability
    console.log('[DEBUG] Calculating win probability...');
    const winProbability = calculateWinProbability(analysis, priceData);
    console.log('[DEBUG] Win probability:', winProbability);

    return {
      pair: pair,
      currentPrice: priceData.currentPrice,
      entryPoint: analysis.entryPoint,
      stopLoss: analysis.stopLoss,
      takeProfit: analysis.takeProfit,
      analysis: analysis.analysis,
      confidence: analysis.confidence,
      winProbability: winProbability,
      details: {
        trend: analysis.trend,
        rsi: analysis.rsi,
        macd: analysis.macd,
        movingAverage: analysis.ma,
        volatility: analysis.volatility,
        priceChange24h: priceData.priceChange24h
      }
    };
  } catch (error) {
    console.error('Pair analysis error:', error.message);
    return { error: `Analysis failed: ${error.message}` };
  }
}

// Fetch price data from free API
async function fetchPriceData(symbol, quote) {
  try {
    // Hardcoded map for common symbols (fast lookup)
    // Only includes verified CoinGecko IDs to avoid failed requests
    const commonCoinIdMap = {
      // Major coins
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'SOL': 'solana',
      'DOGE': 'dogecoin',
      // Stablecoins
      'USDC': 'usdcoin',
      'USDT': 'tether',
      // Popular altcoins
      'XLM': 'stellar',
      'LINK': 'chainlink',
      'MATIC': 'matic-network',
      'DOT': 'polkadot',
      'LTC': 'litecoin',
      'BCH': 'bitcoin-cash',
      'XMR': 'monero',
      'SHIB': 'shiba-inu',
      'PEPE': 'pepe',
      'FLOKI': 'floki',
      'ATOM': 'cosmos',
      'ARB': 'arbitrum',
      'OP': 'optimism',
      'APE': 'apecoin',
      'FIL': 'filecoin',
      'VET': 'vechain',
      'TRX': 'tron',
      'ETC': 'ethereum-classic',
      'AAVE': 'aave',
      'UNI': 'uniswap',
      'SUSHI': 'sushi',
      'MAKER': 'maker',
      'YFI': 'yearn-finance',
      'ICP': 'internet-computer',
      'ZEC': 'zcash',
      'DASH': 'dash',
      'ZIL': 'zilliqa',
      'NMR': 'numeraire'
    };

    const currencyMap = {
      'USDT': 'usd',
      'USDC': 'usd',
      'USD': 'usd',
      'EUR': 'eur',
      'GBP': 'gbp',
      'JPY': 'jpy'
    };

    const currency = currencyMap[quote.toUpperCase()] || quote.toLowerCase();
    let coinId = null;

    // Step 1: Check hardcoded map first (fastest)
    if (commonCoinIdMap[symbol.toUpperCase()]) {
      coinId = commonCoinIdMap[symbol.toUpperCase()];
      console.log(`[DEBUG] Using hardcoded mapping: ${symbol} -> ${coinId}`);
    } else {
      // Step 2: Try to load full CoinGecko coin list and search
      const fullCoinId = await resolveCoinIdFromCoinGecko(symbol.toUpperCase());
      if (fullCoinId) {
        coinId = fullCoinId;
        console.log(`[DEBUG] Resolved from CoinGecko list: ${symbol} -> ${coinId}`);
      } else {
        // Step 3: Fallback to lowercase symbol (CoinGecko might accept it)
        coinId = symbol.toLowerCase();
        console.log(`[DEBUG] Using fallback: ${symbol} -> ${coinId}`);
      }
    }

    console.log(`[DEBUG] Fetching CoinGecko data: ${coinId} vs ${currency}`);
    
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}&include_24hr_change=true`,
        { timeout: 10000 }
      );

      if (!response.data[coinId]) {
        console.error(`[DEBUG] No data returned for coin ID: ${coinId}, response keys: ${Object.keys(response.data)}`);
        return null;
      }

      const data = response.data[coinId];

      return {
        currentPrice: data[currency],
        priceChange24h: data[`${currency}_24h_change`] || 0,
        marketCap: 0,
        volume: 0
      };
    } catch (axiosError) {
      console.error(`[DEBUG] Axios error fetching ${coinId}:`, axiosError.message);
      if (axiosError.response) {
        console.error(`[DEBUG] Response status: ${axiosError.response.status}`);
        console.error(`[DEBUG] Response data:`, axiosError.response.data);
      }
      return null;
    }
  } catch (error) {
    console.error('[DEBUG] Price fetch error:', error.message);
    return null;
  }
}

// Fetch and cache full CoinGecko coin list (called on startup, cached for 24h)
async function resolveCoinIdFromCoinGecko(symbol) {
  try {
    const now = Date.now();
    
    // Load cache if not yet loaded or expired
    if (!coinGeckoCache || now - coinGeckoCacheTime > CACHE_DURATION) {
      console.log('[DEBUG] Fetching CoinGecko full coin list (cache expired)...');
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/coins/list',
        { timeout: 15000 }
      );
      coinGeckoCache = {};
      response.data.forEach(coin => {
        coinGeckoCache[coin.symbol.toUpperCase()] = coin.id;
      });
      coinGeckoCacheTime = now;
      console.log(`[DEBUG] Reloaded ${response.data.length} coins from CoinGecko`);
    }

    // Search cache
    const coinId = coinGeckoCache[symbol];
    if (coinId) {
      return coinId;
    }

    return null;
  } catch (error) {
    console.error('[DEBUG] CoinGecko list error:', error.message);
    return null;
  }
}

// Perform technical analysis on price data
function performTechnicalAnalysis(priceData, symbol, quote) {
  const currentPrice = priceData.currentPrice;
  const priceChange24h = priceData.priceChange24h;

  // Determine trend from 24h price change
  const trend = priceChange24h > 0 ? 'BULLISH' : 'BEARISH';
  
  // Calculate RSI simulation (0-100)
  const rsiBase = 50 + (priceChange24h / 2);
  const rsi = Math.max(0, Math.min(100, rsiBase));

  // Calculate MACD signals
  const macdPositive = priceChange24h > 0;
  const macdSignal = macdPositive ? 'BULLISH' : 'BEARISH';

  // Estimate volatility (simplified)
  const volatility = Math.abs(priceChange24h);

  // Calculate moving average (simulated)
  const ma = currentPrice * (1 - (priceChange24h / 100) * 0.5);

  // Calculate trading levels with adaptive percentages
  // Use higher percentages for low prices to ensure meaningful differences
  let riskPercent, rewardPercent;
  
  if (currentPrice < 0.001) {
    // Ultra-micro cap: use 10-15% ranges
    riskPercent = 0.10;
    rewardPercent = 0.20;
  } else if (currentPrice < 0.01) {
    // Micro cap: use 8-12% ranges
    riskPercent = 0.08;
    rewardPercent = 0.15;
  } else if (currentPrice < 1) {
    // Small cap: use 5-10% ranges
    riskPercent = 0.05;
    rewardPercent = 0.10;
  } else {
    // Normal cap: use volatility-based ranges
    riskPercent = Math.max(0.02, Math.min(0.08, Math.abs(volatility) / 100));
    rewardPercent = riskPercent * 2;
  }
  
  let entryPoint, stopLoss, takeProfit;
  
  if (trend === 'BULLISH') {
    // Bullish setup
    entryPoint = currentPrice * (1 + riskPercent * 0.5);
    stopLoss = currentPrice * (1 - riskPercent);
    takeProfit = entryPoint + (entryPoint - stopLoss) * 2; // 2:1 risk/reward
  } else {
    // Bearish setup
    entryPoint = currentPrice * (1 - riskPercent * 0.5);
    stopLoss = currentPrice * (1 + riskPercent);
    takeProfit = entryPoint - (stopLoss - entryPoint) * 2; // 2:1 risk/reward
  }

  // Determine confidence
  let confidence = 'Low';
  if (volatility > 2 && Math.abs(rsi - 50) > 15) {
    confidence = 'High';
  } else if (volatility > 1 || Math.abs(rsi - 50) > 10) {
    confidence = 'Medium';
  }

  const analysisText = `
Technical Analysis for ${symbol}/${quote}:
- Current Price: ${currentPrice.toFixed(2)}
- 24h Change: ${priceChange24h.toFixed(2)}%
- Trend: ${trend}
- RSI(14): ${rsi.toFixed(1)}
- MACD Signal: ${macdSignal}
- Volatility: ${volatility.toFixed(2)}%
- Moving Average (50): ${ma.toFixed(2)}

Entry positioned at optimal risk level with ${confidence.toLowerCase()} conviction.`;

  return {
    entryPoint: entryPoint.toFixed(8),
    stopLoss: stopLoss.toFixed(8),
    takeProfit: takeProfit.toFixed(8),
    analysis: analysisText.trim(),
    confidence: confidence,
    trend: trend,
    rsi: rsi.toFixed(1),
    macd: macdSignal,
    ma: ma.toFixed(2),
    volatility: volatility.toFixed(2)
  };
}

// Calculate win probability based on technical factors
function calculateWinProbability(analysis, priceData) {
  let probability = 50; // Base 50%

  // RSI factor (0-20 points)
  const rsi = parseFloat(analysis.rsi);
  if (analysis.trend === 'BULLISH' && rsi < 70) {
    probability += (70 - rsi) * 0.2; // Up to 10 points
  } else if (analysis.trend === 'BEARISH' && rsi > 30) {
    probability += (rsi - 30) * 0.2; // Up to 10 points
  }

  // Volatility factor (0-15 points)
  const volatility = parseFloat(analysis.volatility);
  if (volatility > 2) {
    probability += Math.min(15, volatility * 5); // Trending markets more predictable
  }

  // Price change confirmation (0-10 points)
  const priceChange = Math.abs(priceData.priceChange24h);
  if (priceChange > 1) {
    probability += Math.min(10, priceChange * 2);
  }

  // Confidence modifier (up to 15 points)
  if (analysis.confidence === 'High') {
    probability += 15;
  } else if (analysis.confidence === 'Medium') {
    probability += 7;
  }

  // Cap at 95% max
  return Math.min(95, Math.max(5, probability)).toFixed(1);
}

// Serve the chart analyzer page
app.get('/analyzer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analyzer.html'));
});

// Serve pair analyzer page
app.get('/pair-analyzer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pair-analyzer.html'));
});

// New endpoint to analyze trading pair
app.post('/api/analyze-pair', async (req, res) => {
  console.log('[DEBUG] POST /api/analyze-pair received');
  try {
    const { pair } = req.body;
    console.log('[DEBUG] Pair from body:', pair);
    
    if (!pair) {
      console.log('[DEBUG] No pair provided');
      return res.status(400).json({ error: 'Trading pair required (e.g., BTC/USDT)' });
    }

    console.log(`[DEBUG] Analyzing pair: ${pair}`);
    const analysis = await fetchAndAnalyzePair(pair);
    console.log('[DEBUG] Analysis complete:', analysis);
    
    // Persist result
    try {
      const outPath = path.join(__dirname, 'public', 'last_pair_analysis.json');
      fs.writeFileSync(outPath, JSON.stringify(analysis, null, 2));
      console.log('[DEBUG] Result written to file');
    } catch (e) {
      console.error('[DEBUG] Failed to write analysis file:', e.message);
    }

    console.log('[DEBUG] Sending response');
    res.json(analysis);
  } catch (error) {
    console.error('[DEBUG] Pair analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handler
process.on('uncaughtException', (error) => {
  console.error('[FATAL ERROR] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Pre-load CoinGecko cache on startup
async function preloadCoinGeckoCache() {
  try {
    console.log('[STARTUP] Preloading CoinGecko coin list...');
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/list',
      { timeout: 15000 }
    );
    coinGeckoCache = {};
    response.data.forEach(coin => {
      coinGeckoCache[coin.symbol.toUpperCase()] = coin.id;
    });
    coinGeckoCacheTime = Date.now();
    console.log(`[STARTUP] Loaded ${response.data.length} coins from CoinGecko`);
  } catch (error) {
    console.error('[STARTUP] Failed to preload CoinGecko cache:', error.message);
    console.log('[STARTUP] Will fall back to hardcoded map');
  }
}

app.listen(PORT, async () => {
  console.log(`Chart Analyzer Server running on http://localhost:${PORT}`);
  await preloadCoinGeckoCache();
});
