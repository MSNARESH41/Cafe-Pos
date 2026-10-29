import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import MenuItem from '../src/models/MenuItem.js';

await connectDB();
const email = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const password = String(process.env.ADMIN_PASSWORD || '');
if (!email || password.length < 12) {
  throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in .env before seeding');
}
let admin = await User.findOne({ email });
if (!admin) {
  admin = await User.create({
    name: process.env.ADMIN_NAME || 'Cafe Admin', email,
    passwordHash: await bcrypt.hash(password, 12), role: 'admin'
  });
  console.log(`Created admin: ${email}`);
} else console.log(`Admin already exists: ${email}`);

if (await MenuItem.countDocuments() === 0) {
  await MenuItem.insertMany([
    { name: 'Espresso', category: 'Coffee', price: 90, stock: 100, trackStock: false },
    { name: 'Cappuccino', category: 'Coffee', price: 140, stock: 100, trackStock: false },
    { name: 'Cold Coffee', category: 'Coffee', price: 160, stock: 100, trackStock: false },
    { name: 'Veg Sandwich', category: 'Food', price: 120, stock: 50, trackStock: false },
    { name: 'French Fries', category: 'Snacks', price: 110, stock: 50, trackStock: false },
    { name: 'Chocolate Brownie', category: 'Dessert', price: 130, stock: 30, trackStock: false }
  ]);
  console.log('Inserted sample menu items');
}
await Promise.all([User.syncIndexes(), MenuItem.syncIndexes()]);
process.exit(0);
