import Store from "../models/Store.js";
import cloudinary from "../config/cloudinary.js";

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "store" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

// Get store info
export const getStoreInfo = async (req, res) => {
  try {
    const store = await Store.findOne();
    res.json(store || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch store info" });
  }
};

// Create store info
export const createStoreInfo = async (req, res) => {
  try {
    const { name, subName, phone, billInfo } = req.body;
    if (!name || !subName || !phone || !billInfo) return res.status(400).json({ message: "Store name, subName, phone, and billInfo are required" });

    let logoUrl = null;
    if (req.file) {
      logoUrl = await uploadToCloudinary(req.file.buffer);
    }

    const store = await Store.create({
      name,
      subName,
      phone,
      billInfo,
      logo: logoUrl,
    });

    res.status(201).json(store);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create store info" });
  }
};

// Update store info
export const updateStoreInfo = async (req, res) => {
  try {
    const { name, subName, phone, billInfo } = req.body;
    if (!name || !subName || !phone || !billInfo) return res.status(400).json({ message: "Store name, subName, phone, and billInfo are required" });

    let store = await Store.findOne();
    if (!store) return res.status(404).json({ message: "Store info not found. Create first." });

    store.name = name;
    store.subName = subName;
    store.phone = phone;
    store.billInfo = billInfo;

    if (req.file) {
      store.logo = await uploadToCloudinary(req.file.buffer);
    }

    await store.save();
    res.json(store);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update store info" });
  }
};
