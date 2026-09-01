import mongoose from 'mongoose';

// FCM / push registration tokens, shared by the customer app and the delivery
// partner app.
const deviceTokenSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['customer', 'partner'], required: true },
  ownerId: { type: String, required: true, index: true }, // customerId or User._id string
  token: { type: String, required: true, unique: true, index: true },
  platform: { type: String, default: 'android' },
}, { timestamps: true });

export const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);
