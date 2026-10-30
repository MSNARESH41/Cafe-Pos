import 'dotenv/config';
import http from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters');
}
await connectDB();
const app = createApp();
// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    message: "CafePOS Backend is running successfully!",
    status: "OK"
  });
});
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()) }
});
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.active) return next(new Error('Account unavailable'));
    socket.user = { id: user.id, role: user.role };
    next();
  } catch { next(new Error('Invalid socket token')); }
});
io.on('connection', socket => {
  socket.emit('connection:ready', { connected: true });
});
app.set('io', io);
server.listen(port, () => console.log(`CafePOS API listening on ${port}`));

process.on('SIGTERM', () => server.close(() => process.exit(0)));
