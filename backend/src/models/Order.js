import mongoose from 'mongoose';

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true }, // e.g. ORD-98745
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  items: [{
    productId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    weight: { type: String, required: true }
  }],
  subTotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  deliveryCharges: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['COD', 'UPI', 'Card', 'Wallet'], default: 'COD' },
  status: { 
    type: String, 
    enum: [
      'Pending', 'Accepted', 'Packed', 'Ready', 
      'Assigned', 'Out For Delivery', 'Delivered', 
      'Cancelled', 'Returned', 'Refunded', 'Exchange'
    ], 
    default: 'Pending',
    index: true
  },
  deliveryPartnerId: { type: String },
  deliveryPartnerName: { type: String },
  deliveryAddress: {
    type: { type: String }, // Home, Office
    street: { type: String },
    city: { type: String },
    pincode: { type: String },
    lat: { type: Number },
    lng: { type: Number }
  },
  trackingTimeline: [{
    status: { type: String },
    note: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  estimatedDeliveryTime: { type: String, default: '15-20 mins' }
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);
