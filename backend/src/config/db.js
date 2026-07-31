import mongoose from 'mongoose';
import dns from 'dns';

// Fix Windows DNS querySrv ECONNREFUSED for mongodb+srv:// Atlas URIs
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore DNS set failures if not permitted
}

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb+srv://gro:123@cluster0.tkm7c0j.mongodb.net/grocery_enterprise?appName=Cluster0';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      family: 4,
    });
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
    if (error.message.includes('ECONNRESET') || error.message.includes('ECONNREFUSED')) {
      console.warn('💡 Tip: Make sure your IP is whitelisted in MongoDB Atlas Network Access (e.g. 0.0.0.0/0 - Allow Access from Anywhere).');
    }
    mongoose.set('bufferCommands', false);
    return null;
  }
};
