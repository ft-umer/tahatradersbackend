import express from "express";
import Transaction from "../models/Transaction.js";
import Product from "../models/Product.js";

// Helper to generate invoice numbers
function generateInvoiceNo() {
  return `INV-${Date.now().toString().slice(-6)}`;
}

// CREATE TRANSACTION
export const createTransaction = async (req, res) => {
  try {
    const { items = [], paymentMethod, customer, debit, credit } = req.body;
    const userId = req.user._id;

    if (!customer || !customer.name || !customer.phone) {
      return res
        .status(400)
        .json({ message: "Customer name and phone are required" });
    }

    const type = items.length > 0 ? "sale" : "payment";
    let total = 0;

    if (type === "sale") {
      // Calculate total and validate stock
      for (let item of items) {
        const product = await Product.findById(item.product);
        if (!product)
          return res
            .status(404)
            .json({ message: `Product not found: ${item.product}` });
        if (product.stock < item.quantity)
          return res
            .status(400)
            .json({ message: `Insufficient stock for ${product.name}` });
        total += product.price * item.quantity;
        item.price = product.price; // store price at sale
      }

      // Deduct stock
      for (let item of items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    } else {
      // For payment-only transactions, total comes from debit/credit
      total = (debit || 0) - (credit || 0);
      if (total <= 0)
        return res
          .status(400)
          .json({ message: "Payment total must be greater than 0" });
    }

    let finalDebit = 0;
    let finalCredit = 0;

    if (type === "sale") {
      if (paymentMethod === "credit") {
        // Customer owes money
        finalCredit = total;
      } else {
        // Cash / Card / Bank etc
        finalDebit = total;
      }
    } else {
      // payment-only transaction (already correct)
      finalDebit = debit || 0;
      finalCredit = credit || 0;
    }

    const newTransaction = await Transaction.create({
      type,
      invoiceNo: type === "sale" ? generateInvoiceNo() : undefined,
      items,
      total,
      paymentMethod,
      user: userId,
      customer,
      debit: finalDebit || 0,
      credit: finalCredit || 0,
    });

    res.status(201).json({ success: true, transaction: newTransaction });
  } catch (error) {
    console.error("Transaction Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET TRANSACTIONS
export const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate({ path: "items.product", select: "name price image sku" })
      .populate({ path: "user", select: "name email" })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Get Transactions Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update transaction (edit debit / credit / total / customer)
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    // allow updating debit / credit / total / customer / paymentMethod / items (careful)
    if (typeof req.body.debit !== "undefined")
      updates.debit = Number(req.body.debit) || 0;
    if (typeof req.body.credit !== "undefined")
      updates.credit = Number(req.body.credit) || 0;
    if (typeof req.body.total !== "undefined")
      updates.total = Number(req.body.total);
    if (req.body.paymentMethod) updates.paymentMethod = req.body.paymentMethod;
    if (req.body.customer) updates.customer = req.body.customer;

    // If front-end sends items for a sale edit, we allow replacing items but validate stock changes carefully.
    if (Array.isArray(req.body.items)) {
      // validate items: each item must have product and quantity
      for (const it of req.body.items) {
        if (!it.product || !it.quantity) {
          return res
            .status(400)
            .json({ message: "Each item requires product and quantity" });
        }
      }
      updates.items = req.body.items;
    }

    // If debit/credit changed but total not provided, compute total = debit - credit (or sum items if sale)
    if (typeof updates.total === "undefined") {
      if (
        typeof updates.debit !== "undefined" ||
        typeof updates.credit !== "undefined"
      ) {
        const cur = await Transaction.findById(id);
        const debit =
          typeof updates.debit !== "undefined" ? updates.debit : cur.debit || 0;
        const credit =
          typeof updates.credit !== "undefined"
            ? updates.credit
            : cur.credit || 0;
        updates.total = debit - credit;
      }
    }

    // Apply update
    const updated = await Transaction.findByIdAndUpdate(id, updates, {
      new: true,
    }).populate({
      path: "items.product",
      select: "name price image sku",
    });

    if (!updated)
      return res.status(404).json({ message: "Transaction not found" });

    return res.json(updated);
  } catch (err) {
    console.error("Transaction update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
