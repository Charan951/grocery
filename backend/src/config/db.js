import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    // Do not crash the entire process, instead log and allow retries or mock operations
    console.warn('Backend will attempt to proceed, but DB queries will fail without connection.');
  }
};
