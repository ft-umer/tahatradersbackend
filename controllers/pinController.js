import Pin from "../models/Pin.js";

export const createPin = async (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ message: "Pin is required" });
  }

  const existing = await Pin.findOne();
  if (existing) {
    return res.status(400).json({
      message: "Pin already exists. Only one pin is allowed.",
    });
  }

  const newPin = await Pin.create({ pin });
  res.status(201).json(newPin);
};


export const getPin = async (req, res) => {
  const pin = await Pin.findOne();
  if (!pin) {
    return res.status(404).json({ message: "Pin not set" });
  }
  res.json({ pin: pin.pin });
};

export const updatePin = async (req, res) => {
  const { pin } = req.body;

  const updated = await Pin.findOneAndUpdate(
    {},
    { pin },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ message: "Pin not found" });
  }

  res.json(updated);
};
