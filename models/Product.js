import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    sku: String,
    name: String,
    category: String,
    price: Number,
    stock: Number,
    image: String,
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
