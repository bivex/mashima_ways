/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:48
 * Last Updated: 2026-02-24 23:48
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Basic HTML endpoint (replacement for example.com)
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Example Domain</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        p { color: #666; }
    </style>
</head>
<body>
    <h1>Example Domain</h1>
    <p>This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.</p>
    <p><a href="https://www.iana.org/domains/example">More information...</a></p>
</body>
</html>
  `.trim());
});

// JSON endpoint (replacement for jsonplaceholder)
app.get('/todos/1', (req, res) => {
    res.json({
        userId: 1,
        id: 1,
        title: "delectus aut autem",
        completed: false
    });
});

// UUID-like endpoint
app.get('/uuid', (req, res) => {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

    res.json({uuid});
});

// Delay endpoint (replacement for httpbin.org/delay/2)
app.get('/delay/:seconds?', (req, res) => {
    const seconds = parseInt(req.params.seconds) || 2;
    const delay = Math.min(seconds * 1000, 10000); // Max 10 seconds

    console.log(`Delaying response by ${delay}ms`);

    setTimeout(() => {
        res.json({
            delayed: true,
            delay: delay,
            timestamp: new Date().toISOString()
        });
    }, delay);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Simulate slow endpoint for testing
app.get('/slow', (req, res) => {
    setTimeout(() => {
        res.send('Slow response completed');
    }, 5000);
});

// Error endpoint for testing error handling
app.get('/error', (req, res) => {
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'This is a test error endpoint'
    });
});

// Flaky endpoint - randomly returns 429 or 503 for testing retry/backoff
let requestCounter = 0;
app.get('/flaky', (req, res) => {
    requestCounter++;

    // Every 3rd request fails (simulates rate limiting or server issues)
    if (requestCounter % 3 === 0) {
        const errorType = Math.random() > 0.5 ? 429 : 503;
        const errorMessage = errorType === 429 ? 'Too Many Requests' : 'Service Unavailable';

        console.log(`Flaky endpoint: returning ${errorType} (${errorMessage}) for request ${requestCounter}`);

        res.status(errorType).json({
            error: errorMessage,
            retryAfter: errorType === 429 ? 1 : 5,
            requestNumber: requestCounter
        });
    } else {
        console.log(`Flaky endpoint: returning success for request ${requestCounter}`);
        res.json({
            success: true,
            requestNumber: requestCounter,
            timestamp: new Date().toISOString()
        });
    }
});

// Reset flaky counter (for testing)
app.post('/flaky/reset', (req, res) => {
    requestCounter = 0;
    res.json({message: 'Flaky counter reset', counter: requestCounter});
});

// Redirect endpoint for testing
app.get('/redirect', (req, res) => {
    res.redirect('/');
});

// Large response for testing
app.get('/large', (req, res) => {
    const largeData = 'x'.repeat(1024 * 1024); // 1MB response
    res.send(largeData);
});

// Timeout endpoint (will respond after a long time)
app.get('/timeout', (req, res) => {
    // This will timeout most clients
    setTimeout(() => {
        res.send('This response is very late');
    }, 30000); // 30 seconds
});

// Catch-all handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: [
            'GET /',
            'GET /todos/1',
            'GET /uuid',
            'GET /delay/:seconds',
            'GET /health',
            'GET /slow',
            'GET /error',
            'GET /redirect',
            'GET /large',
            'GET /timeout'
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Mock server running on http://localhost:${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET / - Basic HTML page`);
    console.log(`   GET /todos/1 - JSON todo item`);
    console.log(`   GET /uuid - Random UUID`);
    console.log(`   GET /delay/:seconds - Delayed response`);
    console.log(`   GET /health - Health check`);
    console.log(`   GET /slow - 5 second delay`);
    console.log(`   GET /error - Error response`);
    console.log(`   GET /redirect - Redirect to /`);
    console.log(`   GET /large - Large response (1MB)`);
    console.log(`   GET /timeout - Very slow response (30s)`);
});