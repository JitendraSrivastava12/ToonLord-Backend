import mongoose from 'mongoose';
const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log("Database Connected");
  } catch (err) {
    console.error("Connection Error:", err);
  }
};
export default connectDB;