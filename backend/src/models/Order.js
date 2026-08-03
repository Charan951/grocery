import mongoose from 'mongoose';

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true }, // e.g. FC-984210 or PNNHJHTYP81116
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, default: 'Customer' },
  customerPhone: { type: String, required: true, index: true },
  items: [{
    id: { type: String },
    productId: { type: String },
    name: { type: String, required: true },
    weightSpec: { type: String, default: '1 pc' },
    quantity: { type: Number, required: true, default: 1 },
    qty: { type: Number, default: 1 },
    price: { type: Number, required: true },
    mrp: { type: Number },
    image: { type: String }
  }],
  subTotal: { type: Number, default: 0 },
  itemTotal: { type: Number, required: true },
  itemTotalMrp: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  handlingFee: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Paid' },
  paymentMethod: { type: String, default: 'UPI (GPay)' },
  status: { 
    type: String, 
    enum: [
      'Pending', 'In Transit', 'Accepted', 'Packed', 'Ready', 
      'Assigned', 'Out For Delivery', 'Delivered', 
      'Cancelled', 'Returned', 'Refunded'
    ], 
    default: 'In Transit',
    index: true
  },
  deliveryAddress: { type: String, required: true },
  orderPlacedAt: { type: String, default: () => new Date().toLocaleString() },
  orderArrivedAt: { type: String },
  estimatedDelivery: { type: String, default: '8 minutes' }
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);
