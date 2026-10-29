import { Router } from 'express';
import mongoose from 'mongoose';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateTax } from '../utils/tax.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const orders = await Order.find().sort({ createdAt: -1 }).limit(limit)
      .populate('createdBy', 'name email').lean();
    res.json({ orders });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { items, orderType = 'dine-in', tableNumber = '', customerName = '',
      discount = 0, placeOfSupply = 'intra-state', paymentMethod = 'cash',
      paymentStatus = 'paid' } = req.body;
    if (!Array.isArray(items) || items.length < 1 || items.length > 100) {
      return res.status(400).json({ message: 'An order must contain 1–100 items' });
    }
    if (!['dine-in', 'takeaway', 'delivery'].includes(orderType) ||
        !['intra-state', 'inter-state'].includes(placeOfSupply) ||
        !['cash', 'upi', 'card', 'other'].includes(paymentMethod) ||
        !['paid', 'pending'].includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid order or payment option' });
    }
    if (String(tableNumber).length > 20 || String(customerName).length > 100) {
      return res.status(400).json({ message: 'Customer or table details are too long' });
    }

    const ids = [...new Set(items.map(i => String(i.menuItemId || '')))];
    if (ids.some(id => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: 'One or more menu item IDs are invalid' });
    }
    const menuItems = await MenuItem.find({ _id: { $in: ids }, active: true });
    const menuMap = new Map(menuItems.map(item => [item.id, item]));
    const normalized = [];
    for (const row of items) {
      const item = menuMap.get(String(row.menuItemId));
      const quantity = Number(row.quantity);
      if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
        return res.status(400).json({ message: 'Invalid item or quantity' });
      }
      if (item.trackStock && item.stock < quantity) {
        return res.status(409).json({ message: `Insufficient stock for ${item.name}` });
      }
      normalized.push({
        menuItem: item._id, name: item.name, unitPrice: item.price,
        quantity, lineTotal: Math.round(item.price * quantity * 100) / 100
      });
    }
    const subtotal = Math.round(normalized.reduce((sum, row) => sum + row.lineTotal, 0) * 100) / 100;
    const safeDiscount = Number(discount);
    const gstRate = Number(process.env.GST_RATE || 5);
    const tax = calculateTax({ subtotal, discount: safeDiscount, gstRate, placeOfSupply });
    const invoiceNo = `CAF-${new Date().toISOString().slice(0,10).replaceAll('-', '')}-${Date.now().toString().slice(-6)}`;

    const order = await Order.create({
      invoiceNo, items: normalized, orderType, tableNumber: String(tableNumber),
      customerName: String(customerName), ...tax, gstRate, placeOfSupply,
      paymentMethod, paymentStatus, createdBy: req.user.id
    });

    for (const row of normalized) {
      const item = menuMap.get(String(row.menuItem));
      if (item.trackStock) {
        const updated = await MenuItem.findOneAndUpdate(
          { _id: item._id, stock: { $gte: row.quantity } },
          { $inc: { stock: -row.quantity } }, { new: true }
        );
        if (!updated) {
          await Order.findByIdAndDelete(order._id);
          return res.status(409).json({ message: `Stock changed for ${item.name}; refresh and retry` });
        }
      }
    }
    const populated = await Order.findById(order._id).populate('createdBy', 'name email').lean();
    req.app.get('io').emit('order:created', { order: populated });
    res.status(201).json({ order: populated });
  } catch (err) { next(err); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const status = req.body.status;
    if (!['completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Status must be completed or cancelled' });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true })
      .populate('createdBy', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    req.app.get('io').emit('order:updated', { order });
    res.json({ order });
  } catch (err) { next(err); }
});

export default router;
