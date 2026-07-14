import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET;
const mongoUri = process.env.MONGODB_URI;

if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET phải có ít nhất 32 ký tự và chỉ được đặt trong .env.');
if (!mongoUri) throw new Error('MONGODB_URI phải được đặt trong .env.');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '3mb' }));

const modelOptions = {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform: (_document, result) => { result.id = result._id.toString(); delete result._id; } }
};
const User = mongoose.model('User', new mongoose.Schema({ username: { type: String, required: true, unique: true, trim: true }, passwordHash: { type: String, required: true } }, modelOptions));
const Project = mongoose.model('Project', new mongoose.Schema({ title: { type: String, required: true, trim: true }, category: { type: String, enum: ['frontend', 'backend', 'fullstack'], required: true }, year: { type: String, required: true }, desc: { type: String, required: true }, image: { type: String, required: true }, tech: { type: [String], default: [] } }, modelOptions));
const Certificate = mongoose.model('Certificate', new mongoose.Schema({ title: { type: String, required: true, trim: true }, issuer: { type: String, required: true, trim: true }, date: { type: String, required: true, trim: true } }, modelOptions));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Đã có quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.' } });

async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  if (await User.exists({ username })) return;
  if (!process.env.ADMIN_INITIAL_PASSWORD) throw new Error('ADMIN_INITIAL_PASSWORD phải được đặt trong .env khi tạo quản trị viên đầu tiên.');
  await User.create({ username, passwordHash: await bcrypt.hash(process.env.ADMIN_INITIAL_PASSWORD, 12) });
}

async function requireAdmin(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return response.status(401).json({ message: 'Cần đăng nhập quản trị.' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    const admin = await User.findById(payload.sub);
    if (!admin) return response.status(401).json({ message: 'Tài khoản không còn tồn tại.' });
    request.admin = admin;
    return next();
  } catch { return response.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }); }
}

function projectInput(body) {
  const { title, category, year, desc, image, tech = [] } = body;
  if (![title, category, year, desc, image].every(Boolean)) return null;
  if (!['frontend', 'backend', 'fullstack'].includes(category)) return null;
  return { title, category, year, desc, image, tech: Array.isArray(tech) ? tech.map(String) : [] };
}
function certificateInput(body) {
  const { title, issuer, date } = body;
  return [title, issuer, date].every(Boolean) ? { title, issuer, date } : null;
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok', database: 'mongodb' }));
app.post('/api/auth/login', loginLimiter, async (request, response) => {
  const admin = await User.findOne({ username: request.body.username });
  const valid = admin && await bcrypt.compare(request.body.password || '', admin.passwordHash);
  if (!valid) return response.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng.' });
  const token = jwt.sign({ sub: admin.id, username: admin.username, role: 'admin' }, jwtSecret, { expiresIn: '8h' });
  return response.json({ token, username: admin.username });
});
app.post('/api/auth/change-password', requireAdmin, async (request, response) => {
  const { currentPassword, newPassword } = request.body;
  if (!newPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) return response.status(400).json({ message: 'Mật khẩu mới chưa đủ mạnh.' });
  if (!await bcrypt.compare(currentPassword || '', request.admin.passwordHash)) return response.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
  request.admin.passwordHash = await bcrypt.hash(newPassword, 12); await request.admin.save();
  return response.json({ message: 'Đã đổi mật khẩu.' });
});

app.get('/api/projects', async (_request, response) => response.json(await Project.find().sort({ createdAt: -1 })));
app.post('/api/projects', requireAdmin, async (request, response) => { const input = projectInput(request.body); if (!input) return response.status(400).json({ message: 'Dữ liệu dự án chưa đầy đủ.' }); return response.status(201).json(await Project.create(input)); });
app.put('/api/projects/:id', requireAdmin, async (request, response) => { const input = projectInput(request.body); if (!input) return response.status(400).json({ message: 'Dữ liệu dự án chưa đầy đủ.' }); const item = await Project.findByIdAndUpdate(request.params.id, input, { new: true, runValidators: true }); return item ? response.json(item) : response.status(404).json({ message: 'Không tìm thấy dự án.' }); });
app.delete('/api/projects/:id', requireAdmin, async (request, response) => { const item = await Project.findByIdAndDelete(request.params.id); return item ? response.status(204).end() : response.status(404).json({ message: 'Không tìm thấy dự án.' }); });

app.get('/api/certificates', async (_request, response) => response.json(await Certificate.find().sort({ createdAt: -1 })));
app.post('/api/certificates', requireAdmin, async (request, response) => { const input = certificateInput(request.body); if (!input) return response.status(400).json({ message: 'Dữ liệu chứng chỉ chưa đầy đủ.' }); return response.status(201).json(await Certificate.create(input)); });
app.put('/api/certificates/:id', requireAdmin, async (request, response) => { const input = certificateInput(request.body); if (!input) return response.status(400).json({ message: 'Dữ liệu chứng chỉ chưa đầy đủ.' }); const item = await Certificate.findByIdAndUpdate(request.params.id, input, { new: true, runValidators: true }); return item ? response.json(item) : response.status(404).json({ message: 'Không tìm thấy chứng chỉ.' }); });
app.delete('/api/certificates/:id', requireAdmin, async (request, response) => { const item = await Certificate.findByIdAndDelete(request.params.id); return item ? response.status(204).end() : response.status(404).json({ message: 'Không tìm thấy chứng chỉ.' }); });

app.use((error, _request, response, _next) => {
  if (error instanceof mongoose.Error.CastError) return response.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
  console.error(error); return response.status(500).json({ message: 'Đã xảy ra lỗi hệ thống.' });
});

await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
await ensureAdmin();
app.listen(port, () => console.log(`Portfolio API + MongoDB listening on http://localhost:${port}`));
