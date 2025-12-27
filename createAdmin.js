import dotenv from "dotenv";
dotenv.config();
import User from "./models/User.js";
import mongoose from "mongoose";

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'traders',
    })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const createSuperAdmin = async () => {
  try {
    const name = "Super Admin User";
    const email = "superadmin@clothingpos.com"; // change if needed
    const password = "superadmin123!"; // change if needed

    // Check if superAdmin already exists
    const existingSuperAdmin = await User.findOne({ email });
    if (existingSuperAdmin) {
      console.log("⚠️ SuperAdmin already exists:", existingSuperAdmin.email);
      return process.exit();
    }

  const superAdmin = new User({
  username: "superAdmin",      // ✅ Add this
  name,                        // optional if you add name to schema
  email,                       // optional if you add email to schema
  password,
  role: "superAdmin",
});


    await superAdmin.save();
    console.log("✅ SuperAdmin created successfully:", superAdmin.email);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createSuperAdmin();
