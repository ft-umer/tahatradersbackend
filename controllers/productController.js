import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error("getProducts error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const addProduct = async (req, res) => {
  try {
    const { name, category, price, stock,sku } = req.body;

    let imageUrl = "";

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "pos_products" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    const product = await Product.create({
      name,
      category,
      price,
      stock,
      image: imageUrl,
      sku
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("addProduct error:", error);
    res.status(500).json({ message: "Failed to add product", error });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Product ID is required" });
    
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { name, category, price, stock,sku } = req.body;
    product.name = name || product.name;
    product.category = category || product.category;
    product.price = price ?? product.price;
    product.stock = stock ?? product.stock;
    product.sku = sku ?? product.sku;

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "pos_products" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      product.image = result.secure_url;
    }

    await product.save();
    res.json(product);
  } catch (error) {
    console.error("updateProduct error:", error);
    res.status(500).json({ message: "Failed to update product", error });
  }
};



export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params; // ✅ use params now
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted" });
  } catch (error) {
    console.error("deleteProduct error:", error);
    res.status(500).json({ message: "Failed to delete product", error });
  }
};
