import mongoose from "mongoose";

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  subName: {
    type: String,
  },
  
  logo: {
    type: String, // URL of uploaded image
  },
  
  phone: {
    type: String,
  },
  
  billInfo: {
    type: String,
  },
}, { timestamps: true });

const Store = mongoose.model("Store", storeSchema);

export default Store;
