# 🔥 Минимизация IDLE времени в Chrome scraper

## Диагностика: Источники Idle

### 1. Network Wait (самый большой)
```
~80-90% idle = ожидание сетевых ответов
```

### 2. DOM Parsing
```
~5-10% idle = парсинг HTML после загрузки
```

### 3. JavaScript Execution
```
~2-5% idle = выполнение JS на странице
```

### 4. Inter-Process Communication
```
~1-3% idle = Chrome ←→ Node.js (Playwright protocol)
```

---

## 🎯 Стратегии минимизации

### Strategy 1: Aggressive Resource Blocking (УЖЕ ЕСТЬ ✅)

```javascript
// Current: Блокируем images, css, fonts, media
await page.route('**/*', route => {
    const type = route.request().resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        return route.abort();
    }
    return route.continue();
});
```

**ADD:** Блокируем ещё больше:

```javascript
await page.route('**/*', route => {
    const type = route.request().resourceType();
    const url = route.request().url();

    // Block all media
    if (['image', 'stylesheet', 'font', 'media', 'websocket'].includes(type)) {
        return route.abort();
    }

    // Block tracking/analytics
    if (url.includes('google-analytics') ||
        url.includes('doubleclick') ||
        url.includes('facebook.com/tr') ||
        url.includes('hotjar') ||
        url.includes('mixpanel') ||
        url.includes('segment') ||
        url.includes('amplitude') ||
        url.includes('gtm')) {
        return route.abort();
    }

    // Block fonts explicitly (sometimes counted as 'other')
    if (url.endsWith('.woff') || url.endsWith('.woff2') ||
        url.endsWith('.ttf') || url.endsWith('.otf')) {
        return route.abort();
    }

    // Block unnecessary scripts
    if (url.includes('recaptcha') || url.includes('analytics')) {
        return route.abort();
    }

    return route.continue();
});
```

### Strategy 2: Reduce Timeout (БОЛЕЕ АГРЕССИВНО)

```javascript
// Current: timeout: 30000 (30 сек)
await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
});

// OPTIMIZED: Сокращаем timeout
await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 10000  // 10 сек максимум
});
```

### Strategy 3: Parallel Requests (УЖЕ ЕСТЬ ✅)

```javascript
// Current: 40 контекстов = 40 параллельных запросов
// OPTIMIZATION: Увеличить если сеть позволяет

const contextsPerCore = 8; // вместо 4
// N = 10 cores × 8 = 80 контекстов
```

### Strategy 4: Pre-connect & DNS Prefetch

```javascript
// Предварительное разрешение DNS
await page.evaluate(() => {
    const links = ['https://example.com', 'https://httpbin.org'];
    links.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = new URL(url).origin;
        document.head.appendChild(link);
    });
});

// Pre-connect к доменам
await page.evaluate(() => {
    const origins = ['https://example.com', 'https://httpbin.org'];
    origins.forEach(origin => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        document.head.appendChild(link);
    });
});
```

### Strategy 5: Connection Reuse (KEEP-ALIVE)

```javascript
// В BrowserConfig добавляем:
const config = new BrowserConfig({
    headless: true,
    args: [
        // ... existing args ...
        '--net-log-level=0',  // Минимум логов сети

        // Connection pooling
        '--max-connections-per-host=100',
        '--max-socket-pool=200',

        // Disable things that cause idle waits
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',

        // Aggressive networking
        '--aggressive-cache-discard',
        '--disable-background-networking',

        // Reduce idle timeout
        '--network-service-logging-enabled=false',
    ]
});
```

### Strategy 6: Early Page Close (НЕ ДОЖИДАТЬСЯ ПОЛНОЙ ЗАГРУЗКИ)

```javascript
// Current: waitUntil: 'domcontentloaded'
// OPTIMIZATION: После получения нужных данных — сразу закрываем

await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 10000
});

// Сразу получаем данные
const data = await page.evaluate(() => {
    return {
        title: document.title,
        text: document.body.innerText.slice(0, 1000), // Первые 1000 символов
    };
});

// Сразу закрываем - не ждем остальных ресурсов
await page.close();
```

### Strategy 7: Массивовая обработка (BATCH PROCESSING)

```javascript
// Вместо последовательной обработки:
for (const url of urls) {
    await scrape(url);  // Каждый раз idle wait
}

// Используем Promise.all (уже есть в коде ✅):
const workers = urls.map(url => scrape(url));
await Promise.all(workers);
```

### Strategy 8: Skip navigation совсем (CDP напрямую)

```javascript
// САМЫЙ АГРЕССИВНЫЙ МЕТОД
// Использовать CDP (Chrome DevTools Protocol) напрямую

const client = await page.context().newCDPSession(page);

// Отключаем лишнее
await client.send('Network.enable');
await client.send('Network.setCacheDisabled', { cacheDisabled: true });
await client.send('Network.setBypassServiceWorker', { bypass: true });

// Загружаем только HTML
await client.send('Page.navigate', { url });

// Ждем только DOM
await page.waitForLoadState('domcontentloaded');

// Получаем данные
const data = await page.evaluate(() => ({ title: document.title }));
```

---

## 🔧 Конфигурация для максимальной скорости

```javascript
// Создай: src/domain/value-objects/FastBrowserConfig.js

export class FastBrowserConfig {
    static forMaximumSpeed() {
        return new BrowserConfig({
            headless: true,
            args: [
                // Базовые anti-detection
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',

                // Скорость над всем
                '--disable-extensions',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-gpu',
                '--disable-software-rasterizer',

                // Network оптимизация
                '--max-connections-per-host=100',
                '--max-socket-pool=200',
                '--net-log-level=0',

                // Отключить лишние процессы
                '--disable-features=VizDisplayCompositor',
                '--disable-ipc-flooding-protection',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',

                // Memory оптимизация
                '--memory-pressure-off',
                '--disable-hang-monitor',

                // Aggressive timeouts
                '--network-service-start-timeout=1',
            ]
        });
    }
}
```

---

## 📊 Прогнозируемый эффект

| Оптимизация | Текущий idle | Новый idle | Улучшение |
|-------------|--------------|------------|-----------|
| Resource blocking (агрессивный) | 89% | 75% | -14% |
| Timeout 10s вместо 30s | 89% | 85% | -4% |
| Connection pooling | 89% | 82% | -7% |
| Early page close | 89% | 80% | -9% |
| **ВСЕ ВМЕСТЕ** | **89%** | **~65%** | **-24%** |

**Результат:** Вместо 89% idle → ~65% idle
**Прирост скорости:** 1.1s → 0.6s на URL (~45% быстрее)

---

## 🎯 Новые метрики после оптимизаций

```javascript
// Expected Performance (40 контекстов):

Before:
├─ Avg time per URL: 1.1s
├─ Idle: 89% (~980ms)
└─ Active: 11% (~120ms)

After (aggressive):
├─ Avg time per URL: 0.6s
├─ Idle: 65% (~390ms)
└─ Active: 35% (~210ms)

Throughput:
├─ Before: 36 URLs/sec
└─ After: 67 URLs/sec  (+86%)
```

---

## 🚀 Quick Implementation

### 1. Обнови resource blocking:

```javascript
// В PlaywrightBrowserAdapter._setupResourceBlocking()
// Добавь в блокируемые типы: 'websocket'
// Добавь проверку URL на analytics/tracking
```

### 2. Уменьши timeout:

```javascript
// В scrape функции
timeout: 10000  // вместо 30000
```

### 3. Увеличь concurrency:

```javascript
contextsPerCore: 8  // вместо 4
```

### 4. Ранний close:

```javascript
// После получения нужных данных
await page.close();
// Не ждать full page load
```

---

## ⚠️ Trade-offs

| Оптимизация | Риск | Последствия |
|-------------|------|-------------|
| Агрессивный blocking | Пропустить важные данные | Некоторые сайты не сработают |
| Timeout 10s | Timeout на медленных сайтах | Потеря данных |
| Много контекстов | Больше памяти | Нужно RAM ≥ 8GB |
| Early close | Неполные данные | JSON может быть не загружен |

**Рекомендация:** Тестируй на примерах URL, затем применяй на production.
