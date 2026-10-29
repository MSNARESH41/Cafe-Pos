import { Router } from 'express';
import MenuItem from '../models/MenuItem.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const items = await MenuItem.find({ active: true }).sort({ category: 1, name: 1 }).lean();
    res.json({ items });
  } catch (err) { next(err); }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const category = String(req.body.category || 'Other').trim();
    const price = Number(req.body.price);
    const stock = Number(req.body.stock ?? 0);
    if (!name || name.length > 100 || !Number.isFinite(price) || price < 0 ||
        !Number.isFinite(stock) || stock < 0 || category.length > 60) {
      return res.status(400).json({ message: 'Provide a valid name, category, price and stock' });
    }
    const item = await MenuItem.create({
      name, category, price, stock, trackStock: Boolean(req.body.trackStock)
    });
    req.app.get('io').emit('menu:updated', { action: 'created', item });
    res.status(201).json({ item });
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const allowed = {};
    for (const key of ['name', 'category', 'price', 'stock', 'trackStock', 'active']) {
      if (req.body[key] !== undefined) allowed[key] = req.body[key];
    }
    if (allowed.price !== undefined && (!Number.isFinite(Number(allowed.price)) || Number(allowed.price) < 0)) {
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }
    const item = await MenuItem.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    req.app.get('io').emit('menu:updated', { action: 'updated', item });
    res.json({ item });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    req.app.get('io').emit('menu:updated', { action: 'removed', id: item.id });
    res.json({ message: 'Menu item deactivated' });
  } catch (err) { next(err); }
});

export default router;
