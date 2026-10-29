import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true, index: true },
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 }
  }],
  orderType: { type: String, enum: ['dine-in', 'takeaway', 'delivery'], default: 'dine-in' },
  tableNumber: { type: String, default: '', maxlength: 20 },
  customerName: { type: String, default: '', maxlength: 100 },
  subtotal: { type: Number, required: true },
  discount: { type: Number, required: true, default: 0 },
  taxableAmount: { type: Number, required: true },
  gstRate: { type: Number, required: true },
  cgst: { type: Number, required: true, default: 0 },
  sgst: { type: Number, required: true, default: 0 },
  igst: { type: Number, required: true, default: 0 },
  placeOfSupply: { type: String, enum: ['intra-state', 'inter-state'], default: 'intra-state' },
  taxTotal: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'other'], default: 'cash' },
  paymentStatus: { type: String, enum: ['paid', 'pending'], default: 'paid' },
  status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
