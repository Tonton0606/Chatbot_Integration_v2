# Hermes Enterprise Portal - API Documentation

## Base URL

```
Development: http://localhost:5000
Production: https://api.yourdomain.com
```

## Authentication

All API requests (except public endpoints) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Auth Endpoints

#### POST /api/auth/signup
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Corp"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "userId": "uuid"
}
```

#### POST /api/auth/login
Authenticate user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "Admin"
  }
}
```

### User Endpoints

#### GET /api/users/profile
Get current user profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "Admin",
  "companyName": "Acme Corp",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Admin Endpoints

#### GET /api/admin/dashboard
Get admin dashboard statistics.

**Response:**
```json
{
  "totalUsers": 150,
  "activeUsers": 89,
  "newUsersToday": 5,
  "revenue": 50000
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid input data"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

## Rate Limiting

- **Public endpoints**: 100 requests per 15 minutes
- **Authenticated endpoints**: 1000 requests per 15 minutes
- **Admin endpoints**: 500 requests per 15 minutes
