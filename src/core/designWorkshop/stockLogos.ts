/**
 * Stock ticker logo generation for DW-A HTML prototype renderer.
 *
 * Generates letter-avatar SVGs (copyright-safe originals — no third-party assets).
 * Colors represent the primary brand color visible in each company's public marketing.
 * Colors are facts, not copyrighted designs.
 *
 * Covers ~70 commonly traded US equities and ETFs.
 */

/**
 * Short display names for tickers shown under the symbol in position cards.
 * Kept brief to fit within the truncated detail line.
 */
export const TICKER_NAMES: Record<string, string> = {
  // Mega-cap tech
  AAPL: 'Apple Inc.', MSFT: 'Microsoft Corp.', GOOGL: 'Alphabet Inc.',
  GOOG: 'Alphabet Inc.', AMZN: 'Amazon.com Inc.', META: 'Meta Platforms',
  NVDA: 'NVIDIA Corp.', TSLA: 'Tesla Inc.', INTC: 'Intel Corp.',
  AMD: 'AMD Inc.', ORCL: 'Oracle Corp.', IBM: 'IBM Corp.', CSCO: 'Cisco Systems',
  QCOM: 'Qualcomm Inc.', ADBE: 'Adobe Inc.', CRM: 'Salesforce Inc.',
  PYPL: 'PayPal Holdings', SHOP: 'Shopify Inc.', UBER: 'Uber Technologies',
  ABNB: 'Airbnb Inc.', NFLX: 'Netflix Inc.', DIS: 'Walt Disney Co.',
  SPOT: 'Spotify Technology',
  // Finance
  JPM: 'JPMorgan Chase', BAC: 'Bank of America', WFC: 'Wells Fargo',
  GS: 'Goldman Sachs', MS: 'Morgan Stanley', C: 'Citigroup Inc.',
  V: 'Visa Inc.', MA: 'Mastercard Inc.', AXP: 'American Express', BLK: 'BlackRock Inc.',
  // Healthcare
  JNJ: 'Johnson & Johnson', PFE: 'Pfizer Inc.', ABBV: 'AbbVie Inc.',
  MRK: 'Merck & Co.', LLY: 'Eli Lilly & Co.', UNH: 'UnitedHealth Group',
  // Consumer
  WMT: 'Walmart Inc.', TGT: 'Target Corp.', COST: 'Costco Wholesale',
  HD: 'Home Depot', MCD: "McDonald's Corp.", SBUX: 'Starbucks Corp.',
  NKE: 'Nike Inc.',
  // Energy / Industrial
  XOM: 'ExxonMobil Corp.', CVX: 'Chevron Corp.', BA: 'Boeing Co.',
  GE: 'GE Aerospace', CAT: 'Caterpillar Inc.', LMT: 'Lockheed Martin',
  // Vanguard ETFs (brand color: red)
  VTIP: 'Vanguard Inflation-Protected ETF',
  BND:  'Vanguard Total Bond Market ETF',
  VCSH: 'Vanguard Short-Term Corp Bond ETF',
  VOO:  'Vanguard S&P 500 ETF',
  VTI:  'Vanguard Total Stock Market ETF',
  VDC:  'Vanguard Consumer Staples ETF',
  // Schwab ETFs
  SCHD: 'Schwab US Dividend Equity ETF',
  SWPPX:'Schwab S&P 500 Index Fund',
  // iShares ETFs
  SGOV: 'iShares 0-3 Month Treasury ETF',
  IWM:  'iShares Russell 2000 ETF',
  EEM:  'iShares MSCI Emerging Markets ETF',
  AGG:  'iShares Core US Aggregate Bond ETF',
  // SPDR ETFs
  SPY:  'SPDR S&P 500 ETF Trust',
  GLD:  'SPDR Gold Shares',
  GLDM: 'SPDR Gold MiniShares ETF',
  // Invesco
  QQQ:  'Invesco QQQ Trust (Nasdaq-100)',
  // Misc
  DIA:  'SPDR Dow Jones Industrial Average ETF',
  IAU:  'iShares Gold Trust',
  // Watchlist tickers
  SPLV: 'Invesco S&P 500 Low Volatility ETF',
  TLT:  'iShares 20+ Year Treasury Bond ETF',
  VIG:  'Vanguard Dividend Appreciation ETF',
  IDU:  'iShares U.S. Utilities ETF',
  VPU:  'Vanguard Utilities ETF',
}

/** Return short display name for a ticker, or empty string if unknown. */
export function getTickerName(ticker: string): string {
  return TICKER_NAMES[ticker] ?? ''
}

/** Approximate brand primary color for each ticker. Defaults to Jazz primary if not listed. */
export const TICKER_COLORS: Record<string, string> = {
  // Mega-cap tech
  AAPL:  '#555555',
  MSFT:  '#00A4EF',
  GOOGL: '#4285F4',
  GOOG:  '#4285F4',
  AMZN:  '#FF9900',
  META:  '#1877F2',
  NVDA:  '#76B900',
  TSLA:  '#CC0000',
  // Broad tech
  INTC:  '#0071C5',
  AMD:   '#ED1C24',
  ORCL:  '#F80000',
  IBM:   '#1F70C1',
  CSCO:  '#1BA0D7',
  QCOM:  '#3253DC',
  AVGO:  '#CC0000',
  TXN:   '#C40000',
  ADBE:  '#FF0000',
  CRM:   '#00A1E0',
  SNOW:  '#29B5E8',
  PLTR:  '#9B59B6',
  UBER:  '#000000',
  LYFT:  '#FF00BF',
  ABNB:  '#FF5A5F',
  NET:   '#F48120',
  ZM:    '#2196F3',
  PYPL:  '#003087',
  SHOP:  '#96BF48',
  // Finance
  JPM:   '#005EB8',
  BAC:   '#E31837',
  WFC:   '#CC0000',
  GS:    '#7399C6',
  MS:    '#002D72',
  C:     '#056DAE',
  V:     '#1A1F71',
  MA:    '#EB001B',
  AXP:   '#016FD0',
  SCHW:  '#009EC4',
  BLK:   '#000000',
  COF:   '#D03027',
  // Healthcare & Pharma
  JNJ:   '#CC0000',
  PFE:   '#0093D0',
  ABBV:  '#071D49',
  MRK:   '#009BDE',
  LLY:   '#D52B1E',
  UNH:   '#002677',
  CVS:   '#CC0000',
  TMO:   '#E42313',
  GILD:  '#CC9900',
  MRNA:  '#CC3300',
  // Consumer & Retail
  WMT:   '#0071CE',
  TGT:   '#CC0000',
  COST:  '#005DAA',
  HD:    '#F96302',
  LOW:   '#004990',
  MCD:   '#DA291C',
  SBUX:  '#00704A',
  NKE:   '#111111',
  // Media & Entertainment
  DIS:   '#113CCF',
  NFLX:  '#E50914',
  SPOT:  '#1ED760',
  RBLX:  '#E8002D',
  // Telecom
  VZ:    '#CD040B',
  T:     '#00A8E0',
  TMUS:  '#E20074',
  CMCSA: '#F05F22',
  // Energy
  XOM:   '#CC0000',
  CVX:   '#009DD9',
  COP:   '#CC5500',
  SLB:   '#C8102E',
  // Industrial & Defense
  GE:    '#1B77BA',
  BA:    '#1B6BA8',
  CAT:   '#FFCD11',
  MMM:   '#FF0000',
  LMT:   '#1C2951',
  RTX:   '#003087',
  HON:   '#CC0000',
  UPS:   '#4D1C02',
  FDX:   '#4D148C',
  // ETFs — Vanguard (red), Schwab (blue), iShares (gold/orange), SPDR (dark red)
  SPY:   '#005EB8',
  QQQ:   '#7952B3',
  VTI:   '#CC0000',  // Vanguard red
  GLD:   '#C9A84C',
  BND:   '#CC0000',  // Vanguard red
  VTIP:  '#CC0000',  // Vanguard red
  VCSH:  '#CC0000',  // Vanguard red
  VOO:   '#CC0000',  // Vanguard red
  VDC:   '#CC0000',  // Vanguard red
  SCHD:  '#009EC4',  // Schwab blue
  SWPPX: '#009EC4',  // Schwab blue
  SGOV:  '#F7941D',  // iShares orange
  GLDM:  '#8B4513',  // SPDR brown-gold
  IWM:   '#F7941D',  // iShares orange
  EEM:   '#006837',
  DIA:   '#1A5276',
  IAU:   '#C9A84C',
  AGG:   '#F7941D',  // iShares orange
  SPLV:  '#7952B3',  // Invesco purple
  TLT:   '#F7941D',  // iShares orange
  VIG:   '#CC0000',  // Vanguard red
  IDU:   '#F7941D',  // iShares orange
  VPU:   '#CC0000',  // Vanguard red
}

/** Returns true when a string looks like a stock ticker (1–5 uppercase letters only). */
export function isLikelyTicker(s: string): boolean {
  return /^[A-Z]{1,5}$/.test(s.trim())
}

/**
 * Generate a letter-avatar SVG for a ticker symbol.
 * Returns a self-contained SVG string with no external dependencies.
 */
export function getTickerLogoSvg(ticker: string): string {
  const color = TICKER_COLORS[ticker] ?? '#005EB8'
  // Keep max 4 chars visible; use smaller font as length grows
  const label = ticker.length <= 4 ? ticker : ticker.slice(0, 4)
  const fontSize = label.length <= 2 ? 15 : label.length === 3 ? 12 : 9
  const y = label.length <= 3 ? 24 : 23
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">` +
    `<rect width="36" height="36" rx="7" fill="${color}"/>` +
    `<text x="18" y="${y}" font-size="${fontSize}" font-weight="700" fill="white" ` +
    `text-anchor="middle" font-family="system-ui,'Helvetica Neue',sans-serif">${label}</text>` +
    `</svg>`
  )
}

/**
 * Return a base-64 data URI for the ticker logo SVG.
 * Safe to use in <img src="..."> in both browser and Figma plugin sandbox.
 */
export function getTickerLogoDataUri(ticker: string): string {
  return 'data:image/svg+xml;base64,' + btoa(getTickerLogoSvg(ticker))
}
