# Frontend Architecture Note

## Application Boundary

The React/Vite application in `frontend/` is a separate client for the Laravel REST API. It does not connect to the database and treats the API as authoritative for records, validation, authentication, and permissions.

## Request and Authentication Flow

`src/api.js` centralizes the configurable `VITE_API_BASE_URL`, JSON request/response handling, bearer-token headers, and `ApiError` normalization. It preserves backend status and field errors, translates network failures into a controlled message, and emits a session-expired event for unauthorized responses.

`src/context/AuthContext.jsx` owns the current user, token, and loading state. On startup it verifies a stored token with `/auth/me`; login obtains the Sanctum token; logout calls `/auth/logout` and clears local state even if the API is unavailable. This laboratory client stores its token in browser local storage, which is accessible to JavaScript and is not presented as a production credential-storage recommendation.

## Routes, Screens, and Data

`src/App.jsx` contains the route definitions and feature screens. `src/components/ProtectedRoute.jsx` handles unauthenticated navigation and role-based access-denied views. The dashboard, students, programs, courses, academic terms, offerings, enrollments, grades, and academic-record screens call the existing versioned API. Per-screen React state holds fetched data, filters, pagination, and form input; successful writes refresh the relevant API-backed list.

Role-aware navigation improves usability, but it is not a security boundary. Laravel Sanctum, role middleware, policies, and scoped queries enforce access on the server, including object-level restrictions for students and instructors.

## Verification and Build

Vitest and Testing Library exercise the API client, authentication lifecycle, role-protected routes, and server-driven student pagination. jsdom uses deterministic local-storage behavior in tests. `npm run build` produces the deployable Vite output under `dist/`.
