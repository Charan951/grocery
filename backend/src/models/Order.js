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
  paymentId: { type: String },        // gateway payment id (razorpay_payment_id) or wallet txn ref
  paymentRef: { type: String },       // gateway order id (razorpay_order_id)
  status: {
    type: String,
    enum: [
      'Pending', 'In Transit', 'Accepted', 'Packed', 'Ready',
      'Assigned', 'Arrived At Store', 'Out For Delivery', 'Arrived', 'Delivered',
      'Failed', 'Cancelled', 'Returned', 'Refunded'
    ],
    default: 'In Transit',
    index: true
  },
  deliveryAddress: { type: String, required: true },
  deliveryLocation: { lat: { type: Number }, lng: { type: Number } }, // resolved drop coords
  pickup: { name: { type: String }, lat: { type: Number }, lng: { type: Number } }, // dark-store origin
  // Delivery partner assignment
  deliveryPartnerId: { type: String },                 // legacy/display string (kept for back-compat)
  deliveryPartnerName: { type: String },
  deliveryPartnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // real FK
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  assignmentStalled: { type: Boolean, default: false }, // no partner accepted — needs manual attention
  deliveryOtp: { type: String },                        // 4-digit doorstep code
  otpAttempts: { type: Number, default: 0 },
  podPhotoUrl: { type: String },                        // proof-of-delivery photo (Cloudinary)
  failureReason: { type: String },
  pickedUpAt: { type: Date },
  deliveredAt: { type: Date },
  // Append-only status history — every call to updateStatus pushes one entry here.
  // Previously referenced by the controller but missing from the schema, which
  // made PUT /api/orders/:id/status throw on every call.
  trackingTimeline: [{
    status: { type: String },
    note: { type: String },
    at: { type: Date, default: Date.now }
  }],
  orderPlacedAt: { type: String, default: () => new Date().toLocaleString() },
  orderArrivedAt: { type: String },
  estimatedDelivery: { type: String, default: '8 minutes' }
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);
