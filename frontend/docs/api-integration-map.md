# Frontend API Integration Map

Base URL: `VITE_API_BASE_URL`, default `http://127.0.0.1:8000/api/v1`. All requests pass through `src/api.js`; bearer tokens are attached there. See the backend [OpenAPI contract](../../docs/openapi.yaml) for schemas and response formats.

| Frontend screen | API endpoint(s) | Methods | UI roles / behavior |
| --- | --- | --- | --- |
| Login | `/auth/login` | POST | Public; displays invalid-credential response. |
| App bootstrap / profile | `/auth/me` | GET | All authenticated roles; verifies stored token and displays identity/role. |
| Logout | `/auth/logout` | POST | All roles; clears client session even if network is unavailable. |
| Dashboard | `/students`, `/programs`, `/courses`, `/academic-terms`, `/course-offerings`, `/enrollments`, `/grades` | GET | Requests only resources allowed for the role; managers see aggregate counts, instructors assigned academic counts, students own counts. |
| Students | `/students?search=&program_id=&year_level=&status=&sort=&page=&per_page=5` | GET | Admin/registrar/staff list and manage; student list is server-scoped to their own profile and read-only. Lists five records per page with compact icon actions, and includes academic-record access. |
| Student academic record | `/students/{id}/academic-record` | GET | Managers and the student whose profile is requested; backend denies other student IDs. |
| Programs | `/programs` and `/programs/{id}` | GET, POST, PATCH, DELETE | Admin/registrar/staff. List supports search, status filter, sort, and pagination. Delete is a backend deactivation. |
| Courses | `/courses` and `/courses/{id}` | GET, POST, PATCH, DELETE | Admin/registrar/staff. List supports search, status filter, sort, and pagination. |
| Academic Terms | `/academic-terms` and `/academic-terms/{id}` | GET, POST, PATCH, DELETE | Admin/registrar/staff. List supports search, academic-year/semester/status filters, sort, and pagination. |
| Course Offerings | `/course-offerings`, `/course-offerings/{id}`, `/course-offerings/{id}/students` | GET, POST, PATCH, DELETE | Managers manage offerings; instructors view only assigned offerings and their roster. List supports section search, course/term/status filters, sort, and pagination. Instructor choices are derived from API offering responses because the backend does not expose a users directory endpoint. |
| Enrollments | `/enrollments`, `/enrollments/{id}` | GET, POST, PATCH, DELETE | Managers create/change/drop; instructors see assigned offerings' enrollments; students see only their own. List supports status search/filter, student/offering filters, date/status sort, and pagination. Duplicate/capacity conflicts are shown from backend responses. |
| Grades | `/grades`, `/grades/{id}` | GET, POST, PATCH | Managers and assigned instructors enter/update; students see only their own. List supports remarks search, enrollment filter, sort, and pagination. Backend validation and authorization remain authoritative. |
| Student enrollment and grade views | `/students/{id}/enrollments`, `/students/{id}/grades` | GET | Student self-service; manager access follows backend authorization. |

## Response Handling

- `401`: clear local token/user state and return to login.
- `403`: show an access-denied state; route guards and hidden controls are presentation only.
- `404`: show the frontend not-found page for unknown routes; API errors remain visible on their screen.
- `409` / `422`: preserve form values and display backend error text; student field errors are associated with the corresponding inputs.
- Network failure / `500+`: show a safe error and allow the user to retry or resubmit.

## State and Data Flow

The API client normalizes responses and errors. React state holds current-screen filters, form input, loading state, and fetched result sets; after successful writes, screens reload from the backend. The browser never connects to the database and browser storage is not treated as authoritative data.
