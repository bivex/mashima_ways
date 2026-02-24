/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:56
 * Last Updated: 2026-02-24 23:56
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Proxy Configuration Examples for Google Scraping
 * 
 * Copy this file to proxy_config.js and add your real proxy credentials
 * Add proxy_config.js to .gitignore to avoid committing credentials
 */

// Single residential proxy configuration
export const singleProxy = {
    server: 'http://your-proxy.com:8080',
    username: 'your_username',
    password: 'your_password'
};

// Multiple proxies for rotation
export const proxyPool = [
    {
        server: 'http://proxy1.example.com:8080',
        username: 'user1',
        password: 'pass1'
    },
    {
        server: 'http://proxy2.example.com:8080',
        username: 'user2',
        password: 'pass2'
    },
    {
        server: 'http://proxy3.example.com:8080',
        username: 'user3',
        password: 'pass3'
    }
];

// Proxy with authentication via URL
export const proxyWithAuth = {
    server: 'http://username:password@proxy.example.com:8080'
};

// SOCKS5 proxy configuration
export const socks5Proxy = {
    server: 'socks5://proxy.example.com:1080',
    username: 'your_username',
    password: 'your_password'
};

// Proxy rotation helper function
export function getRandomProxy() {
    return proxyPool[Math.floor(Math.random() * proxyPool.length)];
}

// Example usage with rate limiting
export async function scrapeWithRotation(queries, searchFunction) {
    const results = [];
    
    for (const query of queries) {
        const proxy = getRandomProxy();
        
        try {
            console.log(`🔍 Scraping "${query}" via ${proxy.server}...`);
            
            const result = await searchFunction(query, 10, 1, { 
                proxy,
                headless: false,
                useRealChrome: true
            });
            
            results.push({ query, result, proxy: proxy.server });
            
            // Rate limiting: 8 requests per hour per proxy
            // 60 minutes / 8 requests = 7.5 minutes per request
            const delay = 450000 + Math.random() * 60000; // 7.5-8.5 minutes
            console.log(`⏳ Waiting ${Math.round(delay/60000)} minutes before next request...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
        } catch (error) {
            console.error(`❌ Error scraping "${query}":`, error.message);
            results.push({ query, error: error.message, proxy: proxy.server });
        }
    }
    
    return results;
}

// Example usage
/*
import { searchGoogle } from './google_parser_stealth.js';
import { scrapeWithRotation, proxyPool } from './proxy_config.js';

const queries = [
    'how to improve seo',
    'best seo practices',
    'seo optimization tips'
];

const results = await scrapeWithRotation(queries, searchGoogle);
console.log(results);
*/

// Recommended proxy providers (prices as of 2025)
export const proxyProviders = {
    brightData: {
        name: 'Bright Data (Luminati)',
        url: 'https://brightdata.com/',
        pricing: '$500/month minimum',
        ips: '72M+ residential IPs',
        features: ['City targeting', 'ASN targeting', 'Unlimited bandwidth'],
        bestFor: 'Enterprise-scale scraping'
    },
    smartproxy: {
        name: 'Smartproxy',
        url: 'https://smartproxy.com/',
        pricing: '$50-$400/month',
        ips: '40M+ residential IPs',
        features: ['Easy setup', 'Good documentation', 'Affordable'],
        bestFor: 'Small to medium-scale scraping'
    },
    oxylabs: {
        name: 'Oxylabs',
        url: 'https://oxylabs.io/',
        pricing: 'Custom (starts at $300/month)',
        ips: '100M+ residential IPs',
        features: ['Premium quality', 'Best success rates', '24/7 support'],
        bestFor: 'Mission-critical scraping'
    },
    geosurf: {
        name: 'GeoSurf',
        url: 'https://www.geosurf.com/',
        pricing: '$300-$1000/month',
        ips: '2.5M+ residential IPs',
        features: ['SERP specialized', 'City targeting', 'Good support'],
        bestFor: 'Search engine scraping'
    },
    soax: {
        name: 'SOAX',
        url: 'https://soax.com/',
        pricing: '$99-$999/month',
        ips: '8.5M+ residential IPs',
        features: ['Flexible plans', 'Mobile proxies', 'Rotating proxies'],
        bestFor: 'Budget-friendly option'
    }
};

// Free proxy lists (NOT RECOMMENDED for Google - will be blocked)
// Only for testing/learning purposes
export const freeProxies = {
    warning: '⚠️ Free proxies are unreliable and will be blocked by Google',
    sources: [
        'https://free-proxy-list.net/',
        'https://www.sslproxies.org/',
        'https://www.proxy-list.download/',
    ],
    note: 'Use residential proxies for production scraping'
};

// Proxy testing function
export async function testProxy(proxy) {
    const { chromium } = await import('playwright');
    
    console.log(`🧪 Testing proxy: ${proxy.server}...`);
    
    try {
        const browser = await chromium.launch({
            headless: true,
            proxy: proxy
        });
        
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('https://ipinfo.io/json', { timeout: 30000 });
        const content = await page.content();
        const ipInfo = JSON.parse(content.match(/<pre>(.*?)<\/pre>/s)[1]);
        
        await browser.close();
        
        console.log('✅ Proxy working!');
        console.log(`   IP: ${ipInfo.ip}`);
        console.log(`   Location: ${ipInfo.city}, ${ipInfo.region}, ${ipInfo.country}`);
        console.log(`   ISP: ${ipInfo.org}`);
        
        return { success: true, ipInfo };
        
    } catch (error) {
        console.log(`❌ Proxy failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Test all proxies in pool
export async function testProxyPool(pool = proxyPool) {
    console.log(`🧪 Testing ${pool.length} proxies...\n`);
    
    const results = [];
    
    for (let i = 0; i < pool.length; i++) {
        console.log(`[${i + 1}/${pool.length}]`);
        const result = await testProxy(pool[i]);
        results.push({ proxy: pool[i].server, ...result });
        console.log('');
    }
    
    const working = results.filter(r => r.success).length;
    console.log(`\n📊 Results: ${working}/${pool.length} proxies working`);
    
    return results;
}

// Example: Test your proxies
/*
import { testProxyPool, proxyPool } from './proxy_config.js';

const results = await testProxyPool(proxyPool);
console.log(results);
*/

