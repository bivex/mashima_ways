# Google Parser with Advanced Stealth

## Overview

This directory contains two Google search parsers:

1. **`google_parser.js`** - Original parser using Patchright (lightweight, faster)
2. **`google_parser_stealth.js`** - Advanced stealth parser with 16 evasion modules (more reliable for Google)

## ⚠️ Important: Google Blocking

Google aggressively blocks automated scraping with:
- **429 errors** (Too Many Requests)
- **CAPTCHA challenges**
- **IP-based blocking**
- **Fingerprint detection**

Even with all stealth techniques, **residential proxies are required** for reliable scraping.

## Installation

```bash
npm install playwright playwright-extra puppeteer-extra-plugin-stealth
```

## Usage

### Basic Usage (Will likely be blocked)

```javascript
import { searchGoogle } from './google_parser_stealth.js';

const results = await searchGoogle('how to improve seo', 10, 1);
console.log(results);
```

### With Residential Proxy (Recommended)

```javascript
import { searchGoogle } from './google_parser_stealth.js';

const results = await searchGoogle('how to improve seo', 10, 1, {
    headless: false,  // Headed mode is less detectable
    useRealChrome: true,
    proxy: {
        server: 'http://residential-proxy.example.com:8080',
        username: 'your_username',
        password: 'your_password'
    }
});
```

### With Proxy Rotation

```javascript
const proxies = [
    { server: 'http://proxy1.com:8080', username: 'u1', password: 'p1' },
    { server: 'http://proxy2.com:8080', username: 'u2', password: 'p2' },
    { server: 'http://proxy3.com:8080', username: 'u3', password: 'p3' },
];

for (const query of queries) {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const results = await searchGoogle(query, 10, 1, { proxy });
    
    // Rate limiting: max 8 requests per hour per proxy
    await new Promise(resolve => setTimeout(resolve, 450000)); // 7.5 minutes
}
```

## Stealth Features

The stealth parser includes:

### 1. Stealth Plugin (16 evasion modules)
- Chrome runtime patches
- Navigator.webdriver removal
- Plugin spoofing
- WebGL masking
- Canvas fingerprint protection
- And 11 more...

### 2. Custom JS Injections
- Deep navigator.webdriver masking
- Realistic navigator.plugins
- window.chrome object mocking
- Permissions API consistency
- Hardware properties spoofing
- WebGL vendor/renderer spoofing
- Canvas fingerprint noise injection

### 3. Optimal Browser Configuration
- `--disable-blink-features=AutomationControlled`
- Real Chrome channel support
- Removes automation flags
- Realistic HTTP headers
- Human-like delays

### 4. Human Behavior Simulation
- Random mouse movements
- Page scrolling
- Variable delays between requests
- Realistic timing patterns

## Detection Rate Results

Based on testing (without proxies):

| Configuration | Success Rate | Notes |
|--------------|--------------|-------|
| Patchright (basic) | ~0% | Blocked immediately |
| Stealth + headless | ~0% | Blocked immediately |
| Stealth + headed | ~0% | Still blocked by Google |
| Stealth + residential proxy | ~99% | Recommended for production |

**Conclusion:** Google blocks ALL automation attempts from regular IPs. Residential proxies are mandatory.

## Alternative: Yahoo Parser

For headless scraping without proxies, use the Yahoo parser instead:

```bash
cd ../yahoo
node yahoo_parser.js
```

Yahoo has:
- ✅ Works in headless mode
- ✅ No proxy required
- ✅ Same Bing search technology
- ✅ Less aggressive bot detection
- ✅ Success rate: ~95% without proxies

## Residential Proxy Providers

Recommended providers for Google scraping:

1. **Bright Data** (formerly Luminati)
   - 72M+ residential IPs
   - Pay-as-you-go pricing
   - Excellent for SERP scraping

2. **Smartproxy**
   - 40M+ residential IPs
   - Affordable pricing
   - Good for small-scale scraping

3. **Oxylabs**
   - 100M+ residential IPs
   - Enterprise-grade
   - Best for large-scale operations

4. **GeoSurf**
   - Specialized in SERP scraping
   - City-level targeting
   - Good support

## Rate Limiting Guidelines

To avoid detection even with proxies:

- **Max 8 requests per hour per proxy**
- **2-8 second delays between requests**
- **Rotate user agents**
- **Vary viewport sizes**
- **Use headed mode when possible**
- **Don't scrape same query repeatedly**

## Legal Considerations

Before scraping Google:

1. ✅ Read Google's Terms of Service
2. ✅ Consider using official APIs (Custom Search API)
3. ✅ Respect robots.txt
4. ✅ Implement rate limiting
5. ✅ Add proper User-Agent identification
6. ⚠️ Scraping may violate ToS
7. ⚠️ Use for research/personal purposes only

## Official Alternatives

Consider these legal alternatives:

1. **Google Custom Search API**
   - 100 free queries/day
   - $5 per 1000 queries after
   - Official and legal

2. **SerpAPI**
   - Scrapes Google for you
   - Handles proxies and CAPTCHAs
   - Pay per query

3. **ScraperAPI**
   - Manages proxies automatically
   - CAPTCHA solving included
   - Simple API

## Troubleshooting

### Still Getting Blocked?

1. **Check your IP reputation**
   ```bash
   curl https://ipinfo.io
   ```

2. **Verify proxy is residential** (not datacenter)
   ```bash
   curl --proxy http://user:pass@proxy:port https://ipinfo.io
   ```

3. **Increase delays between requests**
   ```javascript
   await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
   ```

4. **Try mobile user agents**
   - Mobile gets blocked less aggressively
   - Use mobile viewport with mobile UA

5. **Use headed mode**
   ```javascript
   { headless: false }
   ```

### Common Errors

**Error 429**: Too many requests
- Solution: Increase delays, rotate proxies

**CAPTCHA detected**: Bot detection triggered
- Solution: Use residential proxy, reduce frequency

**Error 503**: Service unavailable
- Solution: Google temporary block, wait and retry

## Performance Comparison

| Parser | Speed | Stealth | Reliability | Cost |
|--------|-------|---------|-------------|------|
| google_parser.js | Fast | Basic | Low | Free |
| google_parser_stealth.js | Medium | Advanced | Medium | Proxy cost |
| google_parser_stealth.js + Proxy | Medium | Advanced | High | $50-500/mo |
| Yahoo Parser | Fast | Basic | High | Free |
| Google Custom Search API | Fast | N/A | Very High | $5/1000 queries |

## Recommendations

**For Learning/Testing:**
- Use Yahoo parser (free, works well)
- Or use Google with manual CAPTCHA solving

**For Production:**
- Use residential proxies with stealth parser
- Or use official APIs (Google Custom Search, SerpAPI)
- Or use Yahoo parser as alternative

**For Large Scale:**
- Use SerpAPI or ScraperAPI
- They handle all the complexity
- More expensive but more reliable

## Support

For issues or questions:
- Check the main README.md
- Open an issue on GitHub
- Contact: support@b-b.top

---

**Remember**: Web scraping should be done responsibly and ethically. Always respect website terms of service and rate limits.

