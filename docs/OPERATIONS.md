# Operations guide

## Requirements

- A supported Node.js release with `npm`.
- MongoDB Community Server or a reachable MongoDB Atlas database.
- For production: HTTPS termination, a Cloudinary account/URL for image storage, and the checked-in county GeoJSON file.
- Optional Resend account/API key for email status notifications.
- MongoDB Database Tools (`mongodump`) to use the backup script.

Install the project dependencies from the repository root:

```powershell
npm install
```

## Local setup

1. Copy `.env.example` to `.env` and set at least `MONGODB_URI` and a unique `JWT_SECRET` with at least 32 random characters. Keep `.env` out of version control.
2. Confirm MongoDB is running and reachable.
3. Set `STAFF_EMAIL` and a strong, unique `STAFF_PASSWORD` for the initial administrator. `node scripts/seed.js` creates or updates that account as an active admin in the Central Regional Office.
4. Start the web application with `npm start` (or `npm run dev` for Node's watch mode).
5. Open `http://localhost:3000`, then use the staff portal to sign in.

The application connects to MongoDB before accepting HTTP requests. County boundaries are loaded from `data/kenya-counties.json` in the project and do not depend on a live boundary service at startup.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3000` |
| `NODE_ENV` | Set to `production` for production behavior |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign staff login tokens; use a long random value and keep it private |
| `CLIENT_ORIGIN` | Single allowed CORS origin; defaults to `http://localhost:3000` |
| `STAFF_EMAIL`, `STAFF_PASSWORD` | Initial admin credentials for the seed script |
| `STAFF_NAME` | Optional display name for the seed account |
| `CLOUDINARY_URL` | Secure image storage configuration; required when `NODE_ENV=production` |
| `RESEND_API_KEY` | Resend API key for citizen notifications and staff password resets |
| `MAIL_FROM` | Verified sender address used for citizen notifications and staff password resets |

Without `RESEND_API_KEY`, citizen email notifications are logged by the application rather than sent, and self-service staff password resets are unavailable. Configure both `RESEND_API_KEY` and a verified `MAIL_FROM` address to enable staff reset emails. Citizen email is only attempted for reports where the citizen consented and supplied an email address.

## Production deployment

1. Set `NODE_ENV=production`, `PORT`, the production MongoDB URI, a strong `JWT_SECRET`, and the exact browser origin in `CLIENT_ORIGIN`.
2. Run behind HTTPS. The API, uploaded photos, and traffic must use secure transport.
3. Configure a restricted Cloudinary account and set `CLOUDINARY_URL`. Production image upload requests fail with `503` when secure image storage is not configured.
4. Review and version-control the county GeoJSON in `data/kenya-counties.json`. Confirm its coverage and property names match the counties used for routing.
5. Use the seed script only to bootstrap; create individual staff accounts, rotate bootstrap credentials, and remove or disable accounts that should not remain active.
6. Configure `RESEND_API_KEY` and a verified `MAIL_FROM` address if citizens should receive email updates.
7. Schedule backups, keep encrypted copies off the application server, and periodically verify that a backup can be restored.
8. Forward `logs/error.log` to monitored centralized logging and configure alerting. Avoid recording unnecessary personal information in operational logs.

## Backups

Run a one-off database dump from the project root:

```powershell
npm run backup
```

The script invokes `mongodump` using `MONGODB_URI` and writes into a timestamped directory under `backups/`. Ensure the process account can write there, backups are encrypted and moved off-server, and retention is defined. The script reports a failure if MongoDB Database Tools is not installed or the URI cannot be used.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| Process exits before serving | Check `MONGODB_URI`, MongoDB network access, credentials, and `logs/error.log` |
| `/api/reports/boundaries` returns `503` | Check that `data/kenya-counties.json` exists and contains valid GeoJSON county features |
| Submission says coordinates are outside Kenya | Check map selection and longitude/latitude order; the stored GeoJSON point order is `[longitude, latitude]` |
| Image upload returns `503` in production | Configure and validate `CLOUDINARY_URL` |
| Citizen email is not received | Confirm consent and email were provided, `RESEND_API_KEY` and `MAIL_FROM` are valid, and the Resend account accepts delivery; without an API key the message is only logged |
| Backup fails | Install MongoDB Database Tools, verify `mongodump` is on `PATH`, and check MongoDB access and write permissions for `backups/` |

## Maintenance commands

```powershell
npm start
npm run dev
npm run seed
npm run backup
npm test
```

`npm test` runs the Node test files matched by the package script. Tests are not run as part of the operational startup process.
