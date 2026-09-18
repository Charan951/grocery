import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const OrderSchema = new mongoose.Schema({
  orderId: String,
  pickup: Object,
  deliveryLocation: Object,
}, { strict: false });

const DeliveryEarningSchema = new mongoose.Schema({
  orderId: String,
  distanceKm: Number,
  distanceFee: Number,
  total: Number,
}, { strict: false });

const Order = mongoose.model('Order', OrderSchema);
const DeliveryEarning = mongoose.model('DeliveryEarning', DeliveryEarningSchema);

const geoDistKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
};

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('No MONGO_URI in env');
    process.exit(1);
  }
  await mongoose.connect(uri, { family: 4 });
  console.log('Connected to MongoDB');

  const orders = await Order.find({});
  let fixedCount = 0;

  for (const o of orders) {
    const p = o.pickup;
    const d = o.deliveryLocation;
    if (p && d && p.lat != null && p.lng != null && d.lat != null && d.lng != null) {
      const dist = geoDistKm(p.lat, p.lng, d.lat, d.lng);
      if (dist > 25) {
        console.log(`Fixing order ${o.orderId}: previous distance was ${dist.toFixed(1)} km`);
        const newPickupLat = Number((d.lat + 0.012).toFixed(6));
        const newPickupLng = Number((d.lng + 0.012).toFixed(6));
        o.pickup = {
          name: 'FreshCart Express Store',
          lat: newPickupLat,
          lng: newPickupLng,
        };
        await o.save();

        const newDistKm = Math.round(geoDistKm(newPickupLat, newPickupLng, d.lat, d.lng) * 10) / 10;
        const newDistanceFee = Math.round(newDistKm * 6);
        const baseFee = 25;
        const newTotal = baseFee + newDistanceFee;

        await DeliveryEarning.updateOne(
          { orderId: o.orderId },
          {
            $set: {
              distanceKm: newDistKm,
              distanceFee: newDistanceFee,
              baseFee: baseFee,
              total: newTotal,
            }
          }
        );
        fixedCount++;
      }
    }
  }

  console.log(`Successfully fixed ${fixedCount} orders!`);
  await mongoose.disconnect();
}

run().catch(console.error);
