# Student Information Management Frontend

A React/Vite client for the Laravel Student Information Management REST API. All authoritative data, validation, authentication, and authorization come from the backend; this frontend has no database connection.

## Prerequisites

- Node.js 20 or newer and npm.
- PHP 8.2+, Composer, and PostgreSQL for the backend.

## Setup and Run

From the repository root, make sure the Laravel API is configured and running. See the root [backend README](../README.md). Then:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Vite prints the frontend URL (normally `http://localhost:5173`). The default API URL is `http://127.0.0.1:8000/api/v1`; set `VITE_API_BASE_URL` in `frontend/.env` to change it. Vite environment values are public client configuration, never secrets. For a different frontend origin, configure the backend CORS allowlist for that development origin.

Seeded local accounts use the password `password`:

- `admin@example.com` - administrator
- `registrar@example.com` - registrar
- `instructor1@example.com` and `instructor2@example.com` - instructors
- `student@example.com` - student

## Verification

```powershell
npm test
npm run build
```

The Vitest suite checks request headers, error normalization, session expiry, network errors, login/logout, and role-protected routes. See [the API integration map](docs/api-integration-map.md) and [the AI development log](docs/ai-development-log.md).

## Authentication and Data

The client obtains a Sanctum bearer token from `POST /auth/login`, stores it with the current user in browser local storage for this lab client, and sends it through the shared API service. A `401` clears that client session and sends the user to login. A `403` produces an access-denied view. Backend authorization remains authoritative; UI visibility is not a security boundary.

Because local storage is accessible to JavaScript, a production deployment should evaluate an HttpOnly cookie/session-based strategy and apply appropriate XSS protections. Never put database credentials or Laravel signing keys in this frontend.

## Application Map

Screens, endpoints, and permission boundaries are listed in [docs/api-integration-map.md](docs/api-integration-map.md). The backend's OpenAPI document and Postman collection are in the repository's root `docs/` and `postman/` folders.
