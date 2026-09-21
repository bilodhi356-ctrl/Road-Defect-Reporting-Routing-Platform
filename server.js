require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { connectDb } = require('./src/db');
const { loadBoundaries } = require('./src/utils/routing');
const { publicLimiter, authLimiter } = require('./src/middleware/rateLimit');
const { errorHandler, notFound } = require('./src/middleware/errors');
const authRoutes = require('./src/routes/auth');
const reportRoutes = require('./src/routes/reports');
const staffRoutes = require('./src/routes/staff');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'], scriptSrc: ["'self'", 'https://unpkg.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:', 'https://*.basemaps.cartocdn.com', 'https://res.cloudinary.com'], connectSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: [] } } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', methods: ['GET', 'POST', 'PATCH'], credentials: false }));
app.use(express.json({ limit: '200kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/reports', publicLimiter, reportRoutes);
app.use('/api/staff', staffRoutes);
// Explicitly serve only browser assets; never expose source files, .env, logs or backups.
app.get(['/', '/index.html'], (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/app.js', (_req, res) => res.sendFile(path.join(__dirname, 'app.js')));
app.get('/styles.css', (_req, res) => res.sendFile(path.join(__dirname, 'styles.css')));
app.get('/cover.css', (_req, res) => res.sendFile(path.join(__dirname, 'cover.css')));
app.get('/assets/road-cover.jpg', (_req, res) => res.sendFile(path.join(__dirname, 'assets', 'road-cover.jpg')));
app.use(notFound); app.use(errorHandler);

const port = Number(process.env.PORT || 3000);
connectDb().then(() => {
	app.listen(port, () => console.log(`Road Defect Reporting & Routing Platform running at http://localhost:${port}`));
	loadBoundaries().catch(error => console.error('Boundary data unavailable:', error.message));
}).catch(error => { console.error('Database startup failed:', error.message); process.exit(1); });
module.exports = app;
