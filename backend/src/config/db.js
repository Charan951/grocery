import mongoose from 'mongoose';
import dns from 'dns';

// Fix Windows DNS querySrv ECONNREFUSED for mongodb+srv:// Atlas URIs
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore DNS set failures if not permitted
}

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    mongoose.set('bufferCommands', false);
    return null;
  }
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      family: 4,
    });
    return conn;
  } catch (error) {
    mongoose.set('bufferCommands', false);
    return null;
  }
};
