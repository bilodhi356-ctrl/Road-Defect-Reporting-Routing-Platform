# API reference

The API is served by the same origin as the web application. JSON endpoints use `Content-Type: application/json`; report creation and image uploads use `multipart/form-data`. Authenticated routes require `Authorization: Bearer <JWT>` from `POST /api/auth/login`. Login tokens expire after eight hours.

## Public endpoints

### `GET /api/health`

Returns `{ "ok": true }` when the HTTP process is responding. This endpoint does not verify database readiness after startup.

### `GET /api/reports/boundaries`

Returns the loaded county GeoJSON used by the interface for map display and server routing. Returns `503` if boundary data has not loaded.

### `POST /api/reports`

Submit a report using multipart form fields. Use `photo` for the optional image file.

| Field | Required | Constraints |
| --- | --- | --- |
| `category` | Yes | One of the six categories listed in the project guide |
| `severity` | Yes | `Low`, `Medium`, `High`, or `Critical` |
| `latitude`, `longitude` | Yes | Valid decimal GPS coordinates; must fall inside a loaded county polygon |
| `description` | No | Up to 2,000 characters |
| `roadName` | No | Up to 120 characters |
| `landmark` | No | Up to 160 characters |
| `contactConsent` | For contact details | `true` is required when email or phone is supplied |
| `contactEmail` | No | Valid email; required if consent is given without a phone |
| `contactPhone` | No | 7–20 characters from digits, spaces, parentheses, hyphen, and optional leading `+` |
| `photo` | No | JPG, PNG, or WebP, maximum 5 MB |

Success returns HTTP `201` and `{ "report": { ... } }` with the generated reference, status, category, location, county, office, timestamps, and photo-presence/repair-photo-count fields. It does not return contact information. A matching category within 200 metres in the last seven days returns `409`; invalid input returns `400`; unavailable boundaries or production image storage can return `503`.

### `GET /api/reports/track/:reference`

Looks up a report by its public reference (case-insensitive after uppercasing). Returns the same public-safe report fields as submission. An unknown reference returns `404`.

### `POST /api/auth/login`

JSON body:

```json
{ "email": "staff@example.org", "password": "your-password" }
```

Success returns `{ "token": "...", "user": { "id", "name", "email", "role", "office" } }`. Invalid credentials return `401`; missing/non-string credentials return `400`.

### `POST /api/auth/forgot-password`

JSON body: `{ "email": "staff@example.org" }`. Returns `202` with the same generic message whether or not an active staff account matches. When configured, a single-use reset link is sent by email and expires after 30 minutes. Returns `503` if password-reset email delivery is not configured.

### `POST /api/auth/reset-password`

JSON body: `{ "token": "token-from-email", "password": "a-new-long-password" }`. Passwords must be 12–128 characters. A valid reset link can only be used once; invalid or expired links return `400`.

## Authenticated report endpoints

### `GET /api/reports`

Returns `{ "reports": [...] }`, sorted newest first and limited to 250. Optional query parameters: `status` (`New`, `In progress`, `Resolved`) and `category`. Officers see reports in their office or assigned to them; admins and coordinators see all reports. Staff views include assignment, reporter contact when consent was recorded, image URLs, comment count, and audit trail.

### `GET /api/reports/:id/timeline`

Returns the report reference, category, status, county, and a chronological list of audit events and comments. Officers may access only reports in their office or assigned to them. Staff comments are included, so this is not a public tracking endpoint.

### `PATCH /api/reports/:id`

JSON body may include `status` and/or `assignedTo`. Valid statuses are `New`, `In progress`, and `Resolved`. Only admins and coordinators can update `assignedTo`; use a staff account ID or `null` to remove assignment. A supplied assignee must be active. Officers may update status only for reports in their office or assigned to them. Invalid/no changes return `400`; missing report returns `404`; out-of-scope officer access returns `403`.

### `POST /api/reports/:id/comments`

JSON body: `{ "body": "Crew dispatched to inspect drainage." }`. The body must contain 1–1,000 characters. Returns `201` when saved. Comments are internal staff content.

### `POST /api/reports/:id/repair-photos`

Multipart form with one or more `photos` files, up to three files per request. Each file must be JPG, PNG, or WebP and no larger than 5 MB. Returns `201` when the images are stored.

### `DELETE /api/reports/:id`

Admin-only. Deletes the report and returns `{ "message": "Report <reference> deleted." }`. A missing report returns `404`.

## Staff endpoints

All endpoints below require a JWT.

| Method and path | Role | Result |
| --- | --- | --- |
| `GET /api/staff/officers` | Any staff | Active officers; coordinators see only their office |
| `GET /api/staff/users` | Admin | Staff directory without password hashes |
| `POST /api/staff/users` | Admin | Create an account; password must be 12–128 characters |
| `PATCH /api/staff/users/:id` | Admin | Update role, office, active state, and/or password |
| `GET /api/staff/analytics` | Any staff | Totals grouped by status; officer totals are scoped to office/assignment |

Staff creation body:

```json
{
  "name": "Amina Otieno",
  "email": "amina@example.org",
  "office": "Nairobi Regional Office",
  "role": "officer",
  "password": "a-long-unique-password"
}
```

Allowed roles are `admin`, `coordinator`, and `officer`. The server prevents deactivating the current admin account and preserves at least one active administrator.

## Error responses

Errors use `{ "message": "..." }`. Common status codes are `400` for invalid input, `401` for missing/invalid/expired authentication, `403` for insufficient role or office scope, `404` for a missing route or record, `409` for a duplicate report or conflicting record, `429` for rate limiting, and `503` for unavailable required services. Unexpected server errors return a generic message; details are written to `logs/error.log`.
