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
      for (let item of items) {
        const product = await Product.findById(item.product);
        if (!product) throw new Error("Product not found");
        if (product.stock < item.quantity)
          throw new Error("Insufficient stock");

        item.price = product.price;
        total += product.price * item.quantity;
      }

      // deduct stock
      for (let item of items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }

      if (paymentMethod === "credit") {
        finalCredit = total; // customer owes
      } else {
        finalDebit = total; // cash/bank
      }
    } else {
      // payment only
      if ((debit || 0) > 0 && (credit || 0) > 0) {
        return res.status(400).json({
          message: "Debit and credit cannot both be greater than 0",
        });
      }

      total = debit > 0 ? debit : credit;
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

export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { debit, credit, customer } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // ❌ prevent invalid accounting
    if ((debit || 0) > 0 && (credit || 0) > 0) {
      return res.status(400).json({
        message: "Debit and credit cannot both be greater than 0",
      });
    }

    // ✅ update only what is allowed
    if (debit !== undefined) transaction.debit = debit;
    if (credit !== undefined) transaction.credit = credit;

    if (customer) {
      if (customer.name) transaction.customer.name = customer.name;
      if (customer.phone) transaction.customer.phone = customer.phone;
    }

    // ❌ DO NOT RECALCULATE SALE TOTAL HERE
    // total should remain original invoice total

    await transaction.save();

    res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("Update Transaction Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const returnTransaction = async (req, res) => {
  try {
    const { originalTransactionId, items = [] } = req.body;

    const originalTx = await Transaction.findById(originalTransactionId);
    if (!originalTx)
      return res.status(404).json({ message: "Original transaction not found" });

    // Loop through each returned item
    for (let returnedItem of items) {
      const soldItem = originalTx.items.find(
        i => i.product.toString() === returnedItem.product
      );

      if (!soldItem)
        return res.status(400).json({
          message: `Product not found in original sale: ${returnedItem.product}`
        });

      if (returnedItem.quantity > soldItem.quantity)
        return res.status(400).json({
          message: `Return quantity cannot exceed sold quantity`
        });

      // Decrease sold quantity
      soldItem.quantity -= returnedItem.quantity;

      // Restore product stock
      await Product.findByIdAndUpdate(
        returnedItem.product,
        { $inc: { stock: returnedItem.quantity } }
      );
    }

    // Remove items with zero quantity
    originalTx.items = originalTx.items.filter(i => i.quantity > 0);

    // 🔥 IF ALL ITEMS RETURNED → DELETE TRANSACTION
    if (originalTx.items.length === 0) {
      await Transaction.findByIdAndDelete(originalTransactionId);

      return res.status(200).json({
        success: true,
        message: "All items returned. Transaction deleted."
      });
    }

    // Recalculate total
    originalTx.total = originalTx.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    // Update debit / credit
    if (originalTx.paymentMethod === "cash") {
      originalTx.debit = originalTx.total;
      originalTx.credit = 0;
    }

    if (originalTx.paymentMethod === "credit") {
      originalTx.credit = originalTx.total;
      originalTx.debit = 0;
    }

    await originalTx.save();

    res.status(200).json({
      success: true,
      transaction: originalTx
    });

  } catch (err) {
    console.error("Return Transaction Update Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// DELETE TRANSACTION
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Restore stock for all items if it's a sale
    if (transaction.type === "sale" && transaction.items.length > 0) {
      for (let item of transaction.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    await Transaction.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete Transaction Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
