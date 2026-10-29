import { Router } from 'express';
import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [today, allCount, pending, menuCount, recent] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: start }, status: 'completed', paymentStatus: 'paid' } },
        { $group: { _id: null, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      Order.countDocuments({ status: 'completed' }),
      Order.countDocuments({ paymentStatus: 'pending', status: 'completed' }),
      MenuItem.countDocuments({ active: true }),
      Order.find().sort({ createdAt: -1 }).limit(5).lean()
    ]);
    res.json({
      todayRevenue: today[0]?.revenue || 0,
      todayOrders: today[0]?.count || 0,
      allOrders: allCount, pendingPayments: pending, menuCount, recent
    });
  } catch (err) { next(err); }
});

export default router;
