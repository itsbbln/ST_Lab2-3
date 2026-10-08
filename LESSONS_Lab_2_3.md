# LESSONS — Lab 2_3: Role-Based Access Control (RBAC)

This lesson document describes the access-control features implemented in the Student
Information Management API, what each feature does, and **why** it exists. The guiding
rule of the system is:

> **A user can only see the records they own (or are assigned), can only perform the
> actions their role authorizes, and every request is verified server-side.**

The frontend may hide buttons and menus for usability, but the API is the authority:
nothing is trusted from the client.

---

## 1. How a Request Is Authorized (Request Pipeline)

Every API request passes through up to **three independent layers** of verification.
A request must pass *all* of them; a failure at any layer stops the request:

```
Client request
     │
     ▼
┌──────────────────────────────────────────────────────────────┐
│ LAYER 1 — Authentication (Is this a valid, active account?)  │
│  • auth:sanctum        → 401 if no/invalid bearer token      │
│  • EnsureUserIsActive  → 403 if the account is deactivated   │
└──────────────────────────────────────────────────────────────┘
     │ passes
     ▼
┌──────────────────────────────────────────────────────────────┐
│ LAYER 2 — Role gate (Is this role allowed on this route?)    │
│  • RoleMiddleware (`role:administrator,registrar,staff`)     │
│    → 403 if the role is not in the route's allowed list      │
│    Applied to every create/update/delete endpoint.           │
└──────────────────────────────────────────────────────────────┘
     │ passes
     ▼
┌──────────────────────────────────────────────────────────────┐
│ LAYER 3 — Policy (Is this user allowed to touch THIS record?)│
│  • Laravel Policies via $this->authorize(...) in controllers │
│    → 403 if the object belongs to someone else               │
│    Example: an instructor may only grade their own class.    │
└──────────────────────────────────────────────────────────────┘
     │ passes
     ▼
┌──────────────────────────────────────────────────────────────┐
│ LAYER 4 — Query scoping (Collections return only own rows)   │
│  • List endpoints add WHERE clauses based on role before     │
│    pagination, so other people's records are never loaded.   │
└──────────────────────────────────────────────────────────────┘
     │
     ▼
  200 OK (data the user is allowed to see)
```

**Purpose:** Layered checks mean no single mistake (e.g., deleting one line in
`routes/api.php`) opens the API. The role gate answers *"may this role touch this kind
of resource?"*; the policy answers *"may this user touch **this specific row**?"*; the
query scope answers *"which rows may appear in the list?"*. These are different
questions, so they are answered in different places.

---

## 2. Roles

Defined in one place: `app/Support/Roles.php`.

| Role | Intended user | Access summary |
|---|---|---|
| `administrator` | System admin | Full read/write on everything |
| `registrar` | Registrar office | Full read/write on all academic records |
| `staff` | Records staff | Same management rights as registrar |
| `instructor` | Teacher | Read own offerings/students/enrollments; write grades **only** for own classes |
| `student` | Enrolled student | Read **own** profile, enrollments, grades, academic record, and own enrolled offerings — nothing else |

Groups are expressed as constants, not repeated strings:

- `Roles::MANAGEMENT` → `administrator, registrar, staff` (may create/update/delete records)
- `Roles::GRADE_WRITERS` → management + `instructor` (may create/update grades, still object-checked)

**Purpose:** Before this refactor the same role list was typed out in 17 route
declarations. One typo (`registart`) would silently grant/deny access and nobody would
notice. Centralizing the lists means a permission change is a one-line edit and the
route middleware strings (`'role:'.Roles::management()`) can never drift apart.

---

## 3. Features and Their Purpose

### F1 — Central role definitions
- **What:** `App\Support\Roles` holds every role name and role group as constants, plus
  helpers that build the route-middleware strings. `App\Models\User` exposes intent-
  revealing helpers: `isManagement()`, `isInstructor()`, `isStudent()`, `isActive()`.
- **Why:** A single source of truth eliminates copy-paste drift across routes and
  controllers, and `if ($user->isManagement())` reads as intent while
  `in_array($user->role, ['administrator','registrar','staff'], true)` invites mistakes.
- **Where:** `app/Support/Roles.php`, `app/Models/User.php`

### F2 — Route-level role gate (`role:` middleware)
- **What:** `RoleMiddleware` rejects any request whose user role is not in the route's
  allow-list with `403`. Every `POST`/`PUT`/`PATCH`/`DELETE` endpoint declares its
  allowed roles in `routes/api.php`.
- **Why:** This is the "create only if authorized" requirement. A student or instructor
  who posts to `/api/v1/students` is rejected **before** a controller or database is
  ever touched. It also documents each route's permissions in the route file itself.
- **Where:** `app/Http/Middleware/RoleMiddleware.php`, `routes/api.php`

### F3 — Account status enforcement (`EnsureUserIsActive`)
- **What:** A middleware applied to every authenticated route (except `logout`) returns
  `403 {"message": "This account has been deactivated..."}` when `users.status` is not
  `active`. Login already refuses inactive users.
- **Why:** Login is a moment in time; a token can live forever. Without this check, an
  administrator could "deactivate" a user and that user would keep full API access on
  their old token — deactivation would be cosmetic. Now a de-issued account stops
  working on its very next request, while `logout` is deliberately left available so a
  deactivated user can still revoke their token.
- **Where:** `app/Http/Middleware/EnsureUserIsActive.php`, `routes/api.php`

### F4 — Policy-based object authorization (7 Laravel Policies)
- **What:** One policy per resource — `ProgramPolicy`, `CoursePolicy`,
  `AcademicTermPolicy`, `StudentPolicy`, `CourseOfferingPolicy`, `EnrollmentPolicy`,
  `GradePolicy` — each implementing `viewAny / view / create / update / delete`
  (plus the custom `viewRoster` and `grade` abilities). Controllers call
  `$this->authorize(...)` before reading or mutating a specific record.
- **Why:** This answers *"is this **specific** record yours?"* which a route role list
  cannot: an instructor passes the `role:` gate for `PATCH /grades/{id}`, but the
  `GradePolicy::update` check still returns 403 unless the grade belongs to the
  instructor's own course offering. Policies also give one reviewable file per resource
  where all rules for that resource live — an auditor can read the whole permission
  model without spelunking through controllers.
- **Where:** `app/Policies/*.php`, call sites in `app/Http/Controllers/Api/V1/*`

### F5 — Defense in depth (three independent enforcement points)
- **What:** Write endpoints are guarded by *route middleware* **and** *policy
  calls in the controller*; collections are additionally *scoped in the query*.
- **Why:** Each layer catches what the others can't. Earlier, several endpoints were
  protected only by a single line in `routes/api.php`; deleting or reordering that line
  would have silently exposed them. Now removing the middleware still leaves the policy
  check, and bypassing both still leaves query scoping, so an intruder would need three
  independent failures instead of one. Regression tests lock all three layers in place.
- **Where:** `routes/api.php` + `app/Policies/*` + controller query scopes

### F6 — Collection scoping: lists only ever contain your records
- **What:** Before any list query runs, the role decides the `WHERE` clauses:

  | Endpoint | administrator/registrar/staff | instructor | student |
  |---|---|---|---|
  | `GET /students` | all students | **403** (uses rosters instead) | only own row |
  | `GET /enrollments` | all | only own offerings' enrollments | only own |
  | `GET /grades` | all | only own offerings' grades | only own |
  | `GET /course-offerings` | all | only own | only enrolled in |

- **Why:** "Users can only see their own records" must be enforced *before* pagination,
  not by hiding rows afterwards — otherwise other users' data is serialized, logged,
  and counted in `meta.total`. Scoping at the query level means unauthorized rows never
  leave the database, and pagination metadata leaks nothing.
- **Where:** `StudentController::index`, `AcademicController::offerings/enrollments/grades`

### F7 — Students: self-read yes, self-write never
- **What:** A student may `GET /students` and `GET /students/{ownId}` (their own
  profile), but `POST /students`, `PATCH /students/{ownId}` and
  `DELETE /students/{ownId}` return 403 — enforced by both the `role:` gate and
  `StudentPolicy::update/delete`, which are management-only.
- **Why:** Read and write permissions are *different permissions*. The previous
  helper check allowed a student to modify their own record at controller level and was
  only accidentally stopped by the route line. Now the policy makes read access and
  write access explicit, separate decisions — a student can check their data but never
  change it (no changing year level, program, or status).
- **Where:** `app/Policies/StudentPolicy.php`, `StudentController`

### F8 — Instructors: scoped to their own classes, then their own students
- **What:** Instructors may list only offerings where `instructor_id` is themselves;
  may read enrollments/grades only through those offerings; may write grades only for
  enrollments in their own offerings (`EnrollmentPolicy::grade`,
  `GradePolicy::update`). They can additionally view the profile and academic record of
  a student **only if** that student is enrolled in one of their offerings
  (`StudentPolicy::view`), and can never open the full student directory
  (`StudentPolicy::viewAny` denies them).
- **Why:** An instructor needs student data to teach, but only for their own classroom.
  The enrollment table is the link that proves the relationship
  (`users.id → course_offerings.instructor_id → enrollments.course_offering_id →
  enrollments.student_id`), so ownership is checked through it rather than assumed.
  This is *relationship-based* authorization: access exists only where a real
  academic relationship exists.
- **Where:** `app/Policies/StudentPolicy.php`, `EnrollmentPolicy.php`,
  `GradePolicy.php`, `CourseOfferingPolicy.php`

### F9 — Roster privacy (`viewRoster` ability)
- **What:** `GET /course-offerings/{id}/students` (the class roster) is restricted to
  management and the offering's own instructor — students enrolled in that very class
  get 403, even though they *can* view the offering itself (`F10`).
- **Why:** The roster contains *other people's* names and records. A student's right to
  see "their" offering does not extend to seeing every classmate enrolled in it.
  Splitting `view` (class details) from `viewRoster` (who is in the class) into two
  abilities makes that distinction explicit instead of accidental.
- **Where:** `CourseOfferingPolicy::viewRoster`, `AcademicController::offeringStudents`

### F10 — Students can open the offering they are enrolled in
- **What:** A student receives 200 on `GET /course-offerings/{id}` only when an
  enrollment links them to that offering; any other offering returns 403. The
  `GET /course-offerings` list is scoped to enrolled offerings.
- **Why:** Completes the "own records" rule from the student's perspective — the class
  they are taking is part of their academic data, while every other class is not.
  Object-level enrollment lookup (not a role-wide yes/no) keeps it precise.
- **Where:** `CourseOfferingPolicy::view`, `AcademicController::offerings`

### F11 — Explicit error for students without a linked profile
- **What:** If a `student`-role user has `users.student_id = NULL`, the scoped
  endpoints (`/students`, `/enrollments`, `/grades`, `/course-offerings`) return 403
  with a clear authorization failure instead of a silent empty list.
- **Why:** `WHERE student_id = NULL` matches nothing, so a misconfigured account would
  look like "you have no enrollments" — indistinguishable from a data problem and
  impossible to debug. Failing loudly tells the user/administrator that the account is
  not linked to a student profile. It also prevents `students/{id}` ambiguity: an
  unlinked student can never accidentally match someone else's row.
- **Where:** scoping branches in `StudentController` and `AcademicController`

### F12 — Reference data: readable by all, writable by management only
- **What:** Programs, courses, and academic terms are readable by **any authenticated**
  user (`viewAny`/`view` return true) but creatable/updatable/deletable only by
  `administrator`, `registrar`, and `staff`.
- **Why:** Students need program and course catalogs to make sense of their enrollments,
  and instructors need course/term data to teach — but none of them may alter the
  curriculum. Separating "read the catalog" from "edit the catalog" keeps the system
  usable without opening writes. Guests still get 401: nothing is public.
- **Where:** `ProgramPolicy`, `CoursePolicy`, `AcademicTermPolicy`

### F13 — Uniform, non-leaky authorization responses
- **What:** All API authentication/authorization failures render as consistent JSON:
  `401 {"success": false, "message": "Authentication is required."}` and
  `403 {"success": false, "message": "You are not authorized to perform this action."}` —
  including for exceptions raised by policies.
- **Why:** Consistent shapes let clients (and the frontend `ApiError` class) handle
  errors with one code path, and generic messages avoid telling a probing attacker *why*
  access failed (which policy denied, whether a record exists, what the role rules are).
  Details stay in the server logs where they belong.
- **Where:** `bootstrap/app.php` (exception render callbacks)

### F14 — Seeded `staff` account, covering every documented role
- **What:** The seeder now creates `staff@example.com` (password `password`), so all
  five roles in the permission model can be demonstrated end-to-end: administrator,
  registrar, staff, instructor, student.
- **Why:** The `staff` role carried full management rights in every route but had no
  account — the permission existed only on paper and was untestable against the demo
  database. Every role in the matrix now has a login to verify it.
- **Where:** `database/seeders/DatabaseSeeder.php`, README

### F15 — Role-aware frontend UI (presentation-layer guard)
- **What:** The React frontend filters navigation by role, wraps pages in
  `ProtectedRoute` (`allowedRoles` prop) and shows/hides "create/edit" controls with
  `canManage` flags (`frontend/src/components/ProtectedRoute.jsx`, `App.jsx`).
- **Why:** UI guards are about *usability*, not security: a student should not see a
  "New Program" button that would only produce a 403. This is deliberately the *last*
  layer — the backend (F1–F6) remains the authority, because UI state can always be
  bypassed with curl.
- **Where:** `frontend/src/App.jsx`, `frontend/src/components/ProtectedRoute.jsx`

### F16 — Regression test suite for access control
- **What:** `tests/Feature/RoleAccessControlTest.php` (9 scenarios, 140 assertions total
  with the existing suite) proves: deactivated tokens are rejected but can log out;
  students read-only on their own profile; unlinked student accounts are rejected;
  instructors see only their own students; students see only enrolled offerings and
  never rosters; `staff` has full management rights; instructors/students are denied
  all write endpoints; instructor grades are scoped to own offerings; all three
  management roles can read everything. Tests run on in-memory SQLite and never touch
  the PostgreSQL demo data.
- **Why:** Access rules silently rot — a "harmless" refactor can widen permissions.
  Executable permissions are reviewable, repeatable, and run in one command
  (`php artisan test`), turning "we believe it's secure" into "the tests prove it".
- **Where:** `tests/Feature/RoleAccessControlTest.php`, `tests/Feature/StudentApiTest.php`

---

## 4. Permission Matrix (as enforced)

✓ = allowed · — = denied · **own** = only rows the user owns/is assigned

| Action | admin | registrar | staff | instructor | student |
|---|---|---|---|---|---|
| List/view students | ✓ all | ✓ all | ✓ all | ✓ own students only | ✓ own row only |
| Create/update/delete students | ✓ | ✓ | ✓ | — | — |
| View own student profile | — | — | — | — | ✓ |
| List/view programs, courses, terms | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create/update/delete programs, courses, terms | ✓ | ✓ | ✓ | — | — |
| List course offerings | ✓ all | ✓ all | ✓ all | ✓ own | ✓ enrolled only |
| View offering details | ✓ | ✓ | ✓ | ✓ own | ✓ enrolled only |
| View class roster | ✓ | ✓ | ✓ | ✓ own | — |
| Create/update/cancel offerings | ✓ | ✓ | ✓ | — | — |
| List enrollments | ✓ all | ✓ all | ✓ all | ✓ own classes | ✓ own |
| Create/update/drop enrollments | ✓ | ✓ | ✓ | — | — |
| List grades | ✓ all | ✓ all | ✓ all | ✓ own classes | ✓ own |
| View a grade | ✓ | ✓ | ✓ | ✓ own class | ✓ own |
| Create/update grades | ✓ | ✓ | ✓ | ✓ own class only | — |
| View academic record of a student | ✓ | ✓ | ✓ | ✓ own students | ✓ own |
| Deactivated account (`status != active`) | — | — | — | — | — |

---

## 5. Ownership Model (how "own" is determined)

There is no `user_id` sprinkled on every table; ownership is derived from two links:

```
users.student_id ──────────────► students.id ──► enrollments.student_id
                                                        │
users.id ──► course_offerings.instructor_id ──► enrollments.course_offering_id
                                                        │
                                          grades.enrollment_id (1:1)
```

- **Student "own records":** `users.student_id` → the only student row they may read;
  enrollments and grades are reached through `enrollments.student_id`.
- **Instructor "own records":** `course_offerings.instructor_id = users.id` → their
  offerings → enrollments in those offerings → grades for those enrollments → students
  taking those classes.
- **Management:** no ownership filter — the institution scope *is* their scope.

**Purpose:** Deriving ownership from academic relationships (rather than copying
`user_id` onto every table) means the data stays normalized, and access automatically
follows reality: when a student drops a class or an offering is reassigned, the
permissions change with the data instead of drifting out of sync.

---

## 6. How to Verify

```powershell
# Automated suite (in-memory SQLite, does not touch demo data)
php artisan test

# Manual checks — start the API first:
php artisan serve        # http://127.0.0.1:8000
```

Representative checks with seeded accounts (password `password`):

```powershell
$base = 'http://127.0.0.1:8000/api/v1'
function Login($email) { (Invoke-RestMethod -Method Post "$base/auth/login" `
    -ContentType 'application/json' `
    -Body (@{ email = $email; password = 'password' } | ConvertTo-Json)).data.token }

# 1. Student: sees only their own record, cannot modify it
$s = Login 'student@example.com'
Invoke-RestMethod "$base/students" -Headers @{Authorization="Bearer $s"}   # 1 row (own)
Invoke-WebRequest "$base/students/2" -Headers @{Authorization="Bearer $s"} # 403
Invoke-WebRequest -Method Patch "$base/students/1" -Headers @{Authorization="Bearer $s"} `
    -ContentType 'application/json' -Body '{"first_name":"X"}'            # 403

# 2. Instructor: only their own offerings, cannot create students
$i = Login 'instructor1@example.com'
(Invoke-RestMethod "$base/course-offerings" -Headers @{Authorization="Bearer $i"}).meta.total  # own only
Invoke-WebRequest -Method Post "$base/students" -Headers @{Authorization="Bearer $i"} ...       # 403

# 3. Staff: full management rights
$t = Login 'staff@example.com'
Invoke-RestMethod -Method Post "$base/programs" -Headers @{Authorization="Bearer $t}" `
    -ContentType 'application/json' -Body '{"code":"X","name":"X"}'        # 201

# 4. Deactivated account: every request 403 (set status='inactive' for a user)

# 5. Guest: any protected route → 401
Invoke-WebRequest "$base/students"                                          # 401
```

---

## 7. Summary of Files

| File | Role in access control |
|---|---|
| `app/Support/Roles.php` | Single source of truth for roles and role groups |
| `app/Http/Middleware/RoleMiddleware.php` | Layer 2: route-level role gate |
| `app/Http/Middleware/EnsureUserIsActive.php` | Layer 1: blocks deactivated accounts |
| `app/Policies/*.php` (7 policies) | Layer 3: object-level abilities per resource |
| `app/Http/Controllers/Api/V1/*.php` | `$this->authorize(...)` calls + Layer 4 query scoping |
| `routes/api.php` | Declares role requirements per route, wires middleware |
| `app/Models/User.php` | `isManagement()/isInstructor()/isStudent()/isActive()` helpers |
| `bootstrap/app.php` | Uniform JSON 401/403 rendering |
| `tests/Feature/RoleAccessControlTest.php` | Executable proof of the rules above |
| `frontend/src/components/ProtectedRoute.jsx` | UI-level role guard (usability, not security) |

**Key takeaway:** Authentication answers *who you are*, role gating answers *what kind
of actions your role may take*, policies answer *whether this specific record is yours*,
and query scoping ensures data you may not see is never even loaded. Four questions,
four layers — that is what makes "users only access what they are supposed to access"
hold under real-world changes rather than by accident.
