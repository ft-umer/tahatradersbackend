import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Customer', CustomerSchema);
