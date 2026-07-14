import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import pg from 'pg';

const { Pool } = pg;
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const isLocal = frontendOrigin.includes('localhost') || frontendOrigin.includes('127.0.0.1');

if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters and set in .env.');
if (!databaseUrl) throw new Error('DATABASE_URL must be set in .env.');

const secureDatabaseUrl = new URL(databaseUrl);
const isLocalDatabase = secureDatabaseUrl.hostname.includes('localhost') || secureDatabaseUrl.hostname.includes('127.0.0.1');
if (!isLocalDatabase) secureDatabaseUrl.searchParams.set('sslmode', 'verify-full');
const pool = new Pool({ connectionString: secureDatabaseUrl.toString(), ssl: isLocalDatabase ? false : { rejectUnauthorized: true } });

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: frontendOrigin, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'X-CSRF-Token'] }));
app.use(express.json({ limit: '2800kb' }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many login attempts. Please try again in 15 minutes.' } });
const text = (value, maximum) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximum ? value.trim() : null;
const safeEqual = (left, right) => typeof left === 'string' && typeof right === 'string' && left.length === right.length && crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
const cookieOptions = { httpOnly: true, secure: !isLocal, sameSite: isLocal ? 'lax' : 'none', maxAge: 8 * 60 * 60 * 1000, path: '/api' };

function readCookie(request, name) {
  return request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
}
function issueSession(response, admin) {
  const csrfToken = crypto.randomBytes(32).toString('base64url');
  const token = jwt.sign({ sub: String(admin.id), username: admin.username, role: 'admin', csrf: csrfToken }, jwtSecret, { expiresIn: '8h' });
  response.cookie('sean_admin_session', token, cookieOptions);
  return csrfToken;
}
async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (id BIGSERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS projects (id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL CHECK (category IN ('frontend', 'backend', 'fullstack')), year TEXT NOT NULL, description TEXT NOT NULL, image TEXT NOT NULL, tech JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS certificates (id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, issuer TEXT NOT NULL, date TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
  `);
}
async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  if ((await pool.query('SELECT id FROM users WHERE username = $1', [username])).rowCount) return;
  if (!process.env.ADMIN_INITIAL_PASSWORD) throw new Error('ADMIN_INITIAL_PASSWORD must be set in .env to create the first administrator.');
  await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, await bcrypt.hash(process.env.ADMIN_INITIAL_PASSWORD, 12)]);
}
async function requireAdmin(request, response, next) {
  const token = readCookie(request, 'sean_admin_session');
  if (!token) return response.status(401).json({ message: 'Administrator login required.' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !safeEqual(request.get('X-CSRF-Token'), payload.csrf)) return response.status(403).json({ message: 'Invalid security request.' });
    const result = await pool.query('SELECT id, username, password_hash FROM users WHERE id = $1', [payload.sub]);
    if (!result.rowCount) return response.status(401).json({ message: 'This account no longer exists.' });
    request.admin = result.rows[0]; request.csrfToken = payload.csrf; return next();
  } catch { return response.status(401).json({ message: 'The login session is invalid or has expired.' }); }
}
function projectInput(body) {
  const title = text(body.title, 120); const year = text(body.year, 16); const desc = text(body.desc, 2000); const image = text(body.image, 2_700_000);
  const category = body.category;
  const tech = Array.isArray(body.tech) && body.tech.length <= 12 ? body.tech.map(item => text(item, 48)).filter(Boolean) : null;
  if (!title || !year || !desc || !image || !tech || !['frontend', 'backend', 'fullstack'].includes(category)) return null;
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(image)) return null;
  return { title, category, year, desc, image, tech };
}
function certificateInput(body) {
  const title = text(body.title, 160); const issuer = text(body.issuer, 120); const date = text(body.date, 32);
  return title && issuer && date ? { title, issuer, date } : null;
}
function projectRow(row) { return { id: String(row.id), title: row.title, category: row.category, year: row.year, desc: row.description, image: row.image, tech: row.tech, createdAt: row.created_at, updatedAt: row.updated_at }; }
function certificateRow(row) { return { id: String(row.id), title: row.title, issuer: row.issuer, date: row.date, createdAt: row.created_at, updatedAt: row.updated_at }; }

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.post('/api/auth/login', loginLimiter, async (request, response) => {
  const username = text(request.body.username, 80) || '';
  const result = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
  const admin = result.rows[0];
  if (!admin || !await bcrypt.compare(request.body.password || '', admin.password_hash)) return response.status(401).json({ message: 'Invalid username or password.' });
  return response.json({ username: admin.username, csrfToken: issueSession(response, admin) });
});
app.get('/api/auth/session', requireAdmin, (request, response) => response.json({ username: request.admin.username, csrfToken: request.csrfToken }));
app.post('/api/auth/logout', requireAdmin, (_request, response) => { response.clearCookie('sean_admin_session', { httpOnly: true, secure: !isLocal, sameSite: isLocal ? 'lax' : 'none', path: '/api' }); response.status(204).end(); });
app.post('/api/auth/change-password', requireAdmin, async (request, response) => {
  const { currentPassword, newPassword } = request.body;
  if (!newPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) return response.status(400).json({ message: 'The new password is not strong enough.' });
  if (!await bcrypt.compare(currentPassword || '', request.admin.password_hash)) return response.status(400).json({ message: 'The current password is incorrect.' });
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [await bcrypt.hash(newPassword, 12), request.admin.id]);
  return response.json({ message: 'Password updated.' });
});
app.get('/api/projects', async (_request, response) => response.json((await pool.query('SELECT * FROM projects ORDER BY created_at DESC')).rows.map(projectRow)));
app.post('/api/projects', requireAdmin, async (request, response) => { const input = projectInput(request.body); if (!input) return response.status(400).json({ message: 'Invalid project data.' }); const result = await pool.query('INSERT INTO projects (title, category, year, description, image, tech) VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *', [input.title, input.category, input.year, input.desc, input.image, JSON.stringify(input.tech)]); return response.status(201).json(projectRow(result.rows[0])); });
app.put('/api/projects/:id', requireAdmin, async (request, response) => { const input = projectInput(request.body); if (!input) return response.status(400).json({ message: 'Invalid project data.' }); const result = await pool.query('UPDATE projects SET title=$1, category=$2, year=$3, description=$4, image=$5, tech=$6::jsonb, updated_at=NOW() WHERE id=$7 RETURNING *', [input.title, input.category, input.year, input.desc, input.image, JSON.stringify(input.tech), request.params.id]); return result.rowCount ? response.json(projectRow(result.rows[0])) : response.status(404).json({ message: 'Project not found.' }); });
app.delete('/api/projects/:id', requireAdmin, async (request, response) => { const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [request.params.id]); return result.rowCount ? response.status(204).end() : response.status(404).json({ message: 'Project not found.' }); });
app.get('/api/certificates', async (_request, response) => response.json((await pool.query('SELECT * FROM certificates ORDER BY created_at DESC')).rows.map(certificateRow)));
app.post('/api/certificates', requireAdmin, async (request, response) => { const input = certificateInput(request.body); if (!input) return response.status(400).json({ message: 'Invalid certificate data.' }); const result = await pool.query('INSERT INTO certificates (title, issuer, date) VALUES ($1, $2, $3) RETURNING *', [input.title, input.issuer, input.date]); return response.status(201).json(certificateRow(result.rows[0])); });
app.put('/api/certificates/:id', requireAdmin, async (request, response) => { const input = certificateInput(request.body); if (!input) return response.status(400).json({ message: 'Invalid certificate data.' }); const result = await pool.query('UPDATE certificates SET title=$1, issuer=$2, date=$3, updated_at=NOW() WHERE id=$4 RETURNING *', [input.title, input.issuer, input.date, request.params.id]); return result.rowCount ? response.json(certificateRow(result.rows[0])) : response.status(404).json({ message: 'Certificate not found.' }); });
app.delete('/api/certificates/:id', requireAdmin, async (request, response) => { const result = await pool.query('DELETE FROM certificates WHERE id = $1 RETURNING id', [request.params.id]); return result.rowCount ? response.status(204).end() : response.status(404).json({ message: 'Certificate not found.' }); });
app.use((error, _request, response, _next) => { console.error(error); return response.status(500).json({ message: 'A server error occurred.' }); });

await setupDatabase();
await ensureAdmin();
app.listen(port, () => console.log(`Portfolio API + Neon PostgreSQL listening on http://localhost:${port}`));
