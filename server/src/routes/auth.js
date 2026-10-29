import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password || email.length > 254 || password.length > 200) {
      return res.status(400).json({ message: 'Valid email and password are required' });
    }
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.active || !(await user.verifyPassword(password))) {
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }
    const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
