import Unit from "../models/Unit.js";

// Create Unit
export const createUnit = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Unit name is required" });
    }

    const unit = await Unit.create({ name });
    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ message: "Failed to create unit", error });
  }
};

// Get All Units
export const getUnits = async (req, res) => {
  try {
    const units = await Unit.find().sort({ name: 1 });
    res.status(200).json(units);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch units", error });
  }
};

// Update Unit
export const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const unit = await Unit.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    res.status(200).json(unit);
  } catch (error) {
    res.status(500).json({ message: "Failed to update unit", error });
  }
};

// Delete Unit
export const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Unit.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Unit not found" });
    }

    res.status(200).json({ message: "Unit deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete unit", error });
  }
};
