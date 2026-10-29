import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, default: 'Other', trim: true, maxlength: 60 },
  price: { type: Number, required: true, min: 0, max: 1000000 },
  stock: { type: Number, default: 0, min: 0, max: 1000000 },
  trackStock: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('MenuItem', menuItemSchema);
