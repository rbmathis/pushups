# CORS Setup Documentation

## Overview
Cross-Origin Resource Sharing (CORS) has been configured in the Express backend to allow secure communication between the frontend (Vite dev server on port 5173) and backend (Express on port 3001).

## Configuration Details

### Backend CORS Middleware (`backend/src/server.js`)

The CORS configuration includes:

```javascript
const corsOptions = {
  origin: (origin, callback) => {
    // Allowed origins
    const allowedOrigins = [
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000',  // Alternative local testing
      'http://localhost:3001'   // Backend itself
    ];

    // In development, allow all origins for local testing
    if (NODE_ENV === 'development') {
      callback(null, true);
    } else {
      // In production, restrict to specific origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### Configuration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Origins** | localhost:5173, 3000, 3001 | Allowed frontend origins |
| **Methods** | GET, POST, PUT, DELETE, OPTIONS, PATCH | HTTP methods allowed |
| **Headers** | Content-Type, Authorization | Allowed request headers |
| **Credentials** | true | Allows cookies/session support |
| **optionsSuccessStatus** | 200 | HTTP status for successful preflight |

### Environment-Aware Behavior

**Development Mode** (`NODE_ENV=development`):
- Allows ALL origins for flexible local testing
- Useful for testing with different frontend ports/origins

**Production Mode** (`NODE_ENV=production`):
- Restricts to specific allowed origins:
  - http://localhost:5173
  - http://localhost:3000
  - http://localhost:3001

## Verified CORS Headers

### GET Request Example
```
Request Headers:
  Origin: http://localhost:5173
  Content-Type: application/json

Response Headers:
  Access-Control-Allow-Origin: http://localhost:5173
  Access-Control-Allow-Credentials: true
```

### OPTIONS (Preflight) Request Example
```
Request Headers:
  Origin: http://localhost:5173
  Access-Control-Request-Method: POST
  Access-Control-Request-Headers: Content-Type,Authorization

Response Headers:
  Access-Control-Allow-Origin: http://localhost:5173
  Access-Control-Allow-Credentials: true
  Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
  Access-Control-Allow-Headers: Content-Type,Authorization
```

## Environment Variables

### .env.example
```
PORT=3001
DB_PATH=./data/pushups.db
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Usage
Copy `.env.example` to `.env` and modify as needed:
```bash
cp .env.example .env
```

## Testing CORS

### Test 1: Simple GET Request
```javascript
fetch('http://localhost:3001/api/health', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})
.then(res => res.json())
.then(data => console.log('✅ CORS Success:', data))
.catch(err => console.error('❌ CORS Error:', err));
```

### Test 2: POST Request with Authorization
```javascript
fetch('http://localhost:3001/api/health', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  },
  credentials: 'include'
})
.then(res => res.json())
.catch(err => console.error('❌ CORS Error:', err));
```

### Test 3: Using curl
```bash
# Test preflight request
curl -v -X OPTIONS "http://localhost:3001/api/health" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization"

# Test actual GET request
curl -v -X GET "http://localhost:3001/api/health" \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json"
```

## Common Issues & Solutions

### Issue: "No 'Access-Control-Allow-Origin' header"
**Solution:**
1. Ensure backend is running on http://localhost:3001
2. Verify `NODE_ENV=development` or origin is in allowed list
3. Check CORS middleware is applied before routes: `app.use(cors(corsOptions))`

### Issue: Credentials not sent with cross-origin requests
**Solution:**
1. Set `credentials: 'include'` in fetch options
2. Ensure `credentials: true` in CORS config
3. Frontend must be on a different origin than backend

### Issue: Preflight request fails
**Solution:**
1. Verify OPTIONS method is in allowed methods
2. Check requested headers are in allowed headers
3. Ensure CORS middleware handles preflight responses

## Files Modified

1. **backend/src/server.js**
   - Added CORS middleware configuration
   - Environment-aware origin validation
   - Support for credentials and custom headers

2. **backend/.env.example**
   - Added `CORS_ORIGIN` environment variable
   - Documented default development server origins

## Test Results

✅ **All CORS Tests Passed**
- Preflight (OPTIONS) requests: ✓ Working
- GET requests: ✓ Working
- POST requests: ✓ Working
- Authorization headers: ✓ Allowed
- Credentials: ✓ Enabled
- No CORS errors: ✓ Verified

## Next Steps

1. Frontend can now make API calls to backend:
   ```javascript
   const API_URL = 'http://localhost:3001';
   fetch(`${API_URL}/api/pushups`)
   ```

2. Configure production origins in deployment:
   ```javascript
   // Modify allowedOrigins for production
   const allowedOrigins = [
     'https://yourdomain.com',
     'https://www.yourdomain.com'
   ];
   ```

3. Set `NODE_ENV=production` in production environment

## References

- [MDN: Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS middleware](https://www.npmjs.com/package/cors)
- [CORS Tester](https://www.test-cors.org/)
