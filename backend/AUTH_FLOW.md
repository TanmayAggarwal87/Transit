# OTP Authentication Flow Documentation

## Overview
This implementation provides a complete OTP-based authentication system with JWT tokens, refresh tokens, and rate limiting.

## API Endpoints

### 1. POST /auth/send-otp
Generates and sends a 6-digit OTP via SMS.

**Request Body:**
```json
{
  "phone": "9876543210"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "expiresIn": 300
}
```

**Features:**
- Generates random 6-digit OTP
- Stores in Redis with 5-minute TTL
- Rate limited to 5 requests per hour per phone
- Sends via SMS (mocked by default, can integrate Twilio)

---

### 2. POST /auth/verify-otp
Verifies the OTP and returns appropriate response based on user status.

**Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "123456"
}
```

**Response - Existing User:**
```json
{
  "isNewUser": false,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "phone": "9876543210",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://..."
  }
}
```

**Response - New User:**
```json
{
  "isNewUser": true,
  "onboardingToken": "eyJhbGc..."
}
```

**Features:**
- Rate limited to 5 failed attempts (10-minute lockout after)
- One-time use OTP (deleted after verification)
- Returns token for existing users
- Returns onboarding token for new users (10-minute expiry)
- Resets rate limit on successful verification

---

### 3. POST /auth/complete-profile
Creates user account with profile information. Only accessible by new users with valid onboarding token.

**Request Body:**
```json
{
  "phone": "9876543210",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "phone": "9876543210",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://..."
  }
}
```

**Features:**
- Validates email and phone uniqueness
- Creates user in database
- Issues access and refresh tokens

---

### 4. POST /auth/refresh
Refreshes access token using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc..."
}
```

---

## Token Details

### Access Token
- **Expiry:** 15 minutes
- **Usage:** Include in Authorization header: `Authorization: Bearer <accessToken>`
- **Claims:** userId, phone

### Refresh Token
- **Expiry:** 7 days
- **Storage:** Stored in database table `refresh_tokens`
- **Single Use:** Recommended to implement token rotation for enhanced security

---

## Security Features

1. **Rate Limiting on OTP Verification**
   - Max 5 failed attempts per phone number
   - 10-minute lockout after exceeding limit
   - Resets on successful verification

2. **Rate Limiting on OTP Generation**
   - Max 5 OTP requests per hour per phone number

3. **OTP Expiration**
   - 5-minute TTL for each OTP
   - Automatically purged from Redis after expiry

4. **JWT Validation**
   - Token signature verification
   - Expiration checking
   - Payload validation

5. **Refresh Token Management**
   - Stored securely in database
   - Linked to user account
   - Expiration validation

---

## Setup Instructions

### Prerequisites
- PostgreSQL
- Redis
- Node.js 18+

### Installation
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```
3. Update database and Redis connection details
4. Run migrations: `npm run typeorm migration:run` (if migrations exist)
5. Start server: `npm run start:dev`

### Integration with Twilio (Optional)
1. Install Twilio: `npm install twilio`
2. Update `.env`:
   ```
   TWILIO_ACCOUNT_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_PHONE_NUMBER=+1...
   ```
3. Update `src/auth/services/sms.service.ts` - uncomment Twilio code

---

## Error Handling

| Error | Status | Message |
|-------|--------|---------|
| Invalid OTP | 400 | Invalid or expired OTP |
| Too many attempts | 400 | Account locked due to too many failed attempts |
| Rate limit exceeded | 400 | Too many OTP requests. Try again later |
| User exists | 409 | Phone or email already exists |
| Invalid token | 401 | Invalid or expired refresh token |

---

## Testing

Example CURL commands:

```bash
# Send OTP
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'

# Verify OTP
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "otp": "123456"}'

# Complete Profile
curl -X POST http://localhost:3000/auth/complete-profile \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://..."
  }'

# Refresh Token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGc..."}'
```
