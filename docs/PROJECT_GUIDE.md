# Project guide

## Purpose

The Road Defect Reporting & Routing Platform is a web application for reporting road hazards and managing their follow-up. Citizens can submit a report with GPS coordinates and an optional image, then check its status using a reference. Staff use an authenticated portal to review reports, change status, assign officers, add internal comments, and attach repair evidence.

## System layout

| Part | Location | Responsibility |
| --- | --- | --- |
| Browser interface | `public/`, root `app.js`, `dashboard-entry.js`, `track.js`, `styles.css`, `cover.css` | Citizen reporting and tracking, staff sign-in, map, overview, and staff management |
| HTTP application | `server.js` | Express setup, security middleware, static browser assets, API routes, startup |
| API routes | `src/routes/` | Authentication, reports, and staff administration |
| MongoDB models | `src/models/` | Staff accounts and road reports |
| Shared services | `src/services/` | Image storage and citizen email notifications |
| Middleware and utilities | `src/middleware/`, `src/utils/` | Authentication, uploads, validation, error handling, county routing |
| Boundary data | `data/kenya-counties.json` | County polygons used to display and route reports |
| Maintenance scripts | `scripts/` | Initial staff account and database backup |

The server connects to MongoDB before it listens on the configured port. County boundaries are read from the local GeoJSON file in `data/kenya-counties.json`; the report boundary endpoint returns the loaded data and report creation uses it for routing.

## Report lifecycle

1. A citizen submits a category, severity, GPS coordinates, optional description and road details, and an optional photo.
2. The API validates the values and checks for a report with the same category within 200 metres submitted in the prior seven days. A duplicate receives HTTP `409`.
3. The coordinates are matched against the county GeoJSON in `data/kenya-counties.json`. Locations outside its county polygons are rejected. The matched county name determines the regional office label.
4. The server creates a reference such as `KRR-2026-123456`, saves the report, and returns a public-safe report view. If the citizen consented and supplied an email address, a submission update is sent through Resend or logged when no API key is configured.
5. Staff can change the status among `New`, `In progress`, and `Resolved`. Status changes are added to the audit trail and trigger an email when an email address was provided with consent.
6. Staff can add comments and up to three repair photos per request. Public tracking does not return contact details, internal comments, staff assignment, or the audit trail.

The duplicate check is category-and-distance based; it does not compare descriptions or severity.

## Staff roles

| Role | Current access |
| --- | --- |
| `admin` | Report listing and updates; manage staff accounts; view all active officers; analytics across reports |
| `coordinator` | Report listing and updates; view active officers in the coordinator's office; analytics across reports |
| `officer` | Report listing is scoped to reports in the officer's office or assigned to them; timeline access is similarly scoped; analytics are office/assignment scoped |

Any authenticated staff account can add report comments or repair photos. The report update endpoint permits any authenticated staff member to change status; only admins and coordinators can change assignment. Staff account creation and editing are admin-only.

## Data model

### Staff account

Staff records contain a name, unique email, password hash, role, office, active flag, and timestamps. Passwords are stored as bcrypt hashes. Login returns an eight-hour JWT; requests send it as `Authorization: Bearer <token>`. Deactivated accounts cannot use an existing token because the account is checked on authenticated requests.

### Report

Reports store a unique public reference; category, severity, description, road name, landmark; consent and any supplied contact details; a GeoJSON point (longitude, latitude); county and office; status; reporter and repair photos; optional officer assignment; staff comments; an audit trail; and creation/update timestamps.

Categories are `Pothole`, `Erosion / washout`, `Damaged culvert`, `Blocked drainage`, `Damaged bridge`, and `Other road hazard`. Severities are `Low`, `Medium`, `High`, and `Critical`.

## Privacy and security behavior

- Staff endpoints require a valid JWT; role-restricted operations return `403` when the role is insufficient.
- Public tracking looks up a report by reference and returns only the public report fields.
- Citizen email/phone fields are accepted only with explicit consent. Email notifications are sent only when consent is true and an email was provided.
- Uploads accept JPG, PNG, and WebP images up to 5 MB. With Cloudinary configured, images are stored there; in development without Cloudinary, upload data is stored as data URLs. Production image uploads require Cloudinary.
- Express uses Helmet, a configured CORS origin, request body size limits, login/public rate limits, and does not expose source files, logs, backups, or `.env` as static assets.

For endpoint details and deployment requirements, see [API reference](API.md) and [operations guide](OPERATIONS.md).
