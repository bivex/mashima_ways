# Mock Server for Invariant Tests

This mock server provides local endpoints for testing the scraping application without relying on external services.

## Installation

```bash
cd mock-server
npm install
```

## Running the Server

```bash
npm start
```

The server will start on `http://localhost:3000` by default.

## Available Endpoints

### GET /

Basic HTML page (replacement for example.com)

```bash
curl http://localhost:3000/
```

### GET /todos/1

JSON response with a todo item (replacement for jsonplaceholder)

```bash
curl http://localhost:3000/todos/1
```

### GET /uuid

Returns a random UUID

```bash
curl http://localhost:3000/uuid
```

### GET /delay/:seconds

Returns a delayed JSON response (default 2 seconds)

```bash
curl http://localhost:3000/delay/2
```

### GET /health

Health check endpoint

```bash
curl http://localhost:3000/health
```

### GET /slow

5-second delay response

```bash
curl http://localhost:3000/slow
```

### GET /error

Returns a 500 error for testing error handling

```bash
curl http://localhost:3000/error
```

### GET /redirect

Redirects to the root endpoint

```bash
curl http://localhost:3000/redirect
```

### GET /large

Returns a large response (1MB) for testing

```bash
curl http://localhost:3000/large
```

### GET /timeout

Very slow response (30 seconds) for testing timeouts

```bash
curl http://localhost:3000/timeout
```

## Testing

To run the invariant tests with the mock server:

1. Start the mock server:
   ```bash
   cd mock-server && npm start
   ```

2. In another terminal, run the invariant tests:
   ```bash
   node test_invariants.js
   ```

## Configuration

The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```