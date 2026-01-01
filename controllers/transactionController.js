import express from "express";
import Transaction from "../models/Transaction.js";
import Product from "../models/Product.js";
import Return from "../models/Return.js";

// Helper to generate invoice numbers
function generateInvoiceNo() {
  return `INV-${Date.now().toString().slice(-6)}`;
}

// CREATE TRANSACTION
export const createTransaction = async (req, res) => {
  try {
    const {
      items = [],
      paymentMethod: pm, // rename to avoid const reassignment
      customer,
      debit,
      credit,
      cash,
      online,
    } = req.body;
    const userId = req.user._id;

    if (!customer || !customer.name || !customer.phone) {
      return res
        .status(400)
        .json({ message: "Customer name and phone are required" });
    }

    const type = items.length > 0 ? "sale" : "payment";
    let total = 0;

    let finalDebit = 0;
    let finalCredit = 0;
    let finalCash = 0;
    let finalOnline = 0;
    let finalPaymentMethod = pm; // use a separate variable for saving

    // ================= SALE =================
    if (type === "sale") {
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product)
          return res
            .status(404)
            .json({ message: `Product not found: ${item.product}` });

        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          });
        }

        const unitPrice = item.price ?? product.price;
        const itemTotal = item.total ?? unitPrice * item.quantity;

        item.price = unitPrice;
        item.total = itemTotal;

        total += itemTotal;
      }

      // Deduct stock
      for (const item of items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }

      // ================= PAYMENT LOGIC =================
      if (pm === "split") {
        const cashVal = cash || 0;
        const onlineVal = online || 0;
        const creditVal = credit || 0;

        const sum = cashVal + onlineVal + creditVal;
        if (sum !== total) {
          return res.status(400).json({
            message: "Cash + Online + Credit must equal total",
          });
        }

        finalCash = cashVal;
        finalOnline = onlineVal;
        finalDebit = cashVal + onlineVal;
        finalCredit = creditVal;

        finalPaymentMethod = "split";
      } else if (pm === "cash") {
        finalCash = total;
        finalDebit = total;
        finalCredit = 0;
        finalOnline = 0;
      } else if (pm === "online") {
        finalOnline = total;
        finalDebit = total;
        finalCash = 0;
        finalCredit = 0;
      } else if (pm === "credit") {
        finalCredit = total;
        finalDebit = 0;
        finalCash = 0;
        finalOnline = 0;
      }
    }

    // ================= PAYMENT ONLY =================
    else {
      if ((debit || 0) > 0 && (credit || 0) > 0) {
        return res
          .status(400)
          .json({ message: "Debit and credit cannot both be greater than 0" });
      }

      total = debit > 0 ? debit : credit;
      if (total <= 0)
        return res
          .status(400)
          .json({ message: "Payment total must be greater than 0" });

      finalDebit = debit || 0;
      finalCredit = credit || 0;
      finalPaymentMethod = debit > 0 ? "cash" : "credit";
    }

    const newTransaction = await Transaction.create({
      type,
      invoiceNo: type === "sale" ? generateInvoiceNo() : undefined,
      items,
      total,
      paymentMethod: finalPaymentMethod, // save correct method
      user: userId,
      customer,
      debit: finalDebit,
      credit: finalCredit,
      cash: finalCash,
      online: finalOnline,
    });

    res.status(201).json({ success: true, transaction: newTransaction });
  } catch (error) {
    console.error("Transaction Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { credit, debit, paymentMethod: pm, customer } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const total = transaction.total;

    /* ------------------------------------------------
       1️⃣ CREDIT-ONLY UPDATE (Frontend Edit Credit)
       👉 DO NOT TOUCH ANY OTHER FIELD
    ------------------------------------------------ */
    if (credit !== undefined && pm === undefined && debit === undefined) {
    

      transaction.credit = credit;

      await transaction.save();
      return res.json({ success: true, transaction });
    }

    /* ------------------------------------------------
       2️⃣ NORMAL PAYMENT METHOD UPDATE
    ------------------------------------------------ */
    let finalDebit = 0;
    let finalCredit = 0;
    let finalCash = 0;
    let finalOnline = 0;
    let finalPaymentMethod = pm;

    if ((debit || 0) > 0 && (credit || 0) > 0) {
      return res
        .status(400)
        .json({ message: "Debit and credit cannot both be greater than 0" });
    }

    if (pm === "cash") {
      finalCash = total;
      finalDebit = total;
    } else if (pm === "online") {
      finalOnline = total;
      finalDebit = total;
    } else if (pm === "credit") {
      finalCredit = total;
    }

    // Safe customer update
    if (customer) {
      transaction.customer = transaction.customer || {};
      if (customer.name !== undefined)
        transaction.customer.name = customer.name;
      if (customer.phone !== undefined)
        transaction.customer.phone = customer.phone;
      if (customer.address !== undefined)
        transaction.customer.address = customer.address;
    }

    transaction.paymentMethod = finalPaymentMethod;
    transaction.debit = finalDebit;
    transaction.credit = finalCredit;
    transaction.cash = finalCash;
    transaction.online = finalOnline;

    await transaction.save();
    res.json({ success: true, transaction });
  } catch (error) {
    console.error("Update Transaction Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// GET SINGLE TRANSACTION BY ID
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id)
      .populate({
        path: "items.product",
        select: "name price costPrice image sku",
      })
      .populate({ path: "user", select: "name email" });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Get Transaction By ID Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// GET TRANSACTIONS
export const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate({
        path: "items.product",
        select: "name price costPrice image sku",
      })
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

export const getReturns = async (req, res) => {
  try {
    const returns = await Return.find()
      .populate({
        path: "user",
        select: "name phone", // original buyer info
      })
      .populate({
        path: "items.product",
        select: "name price",
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, returns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const returnTransaction = async (req, res) => {
  try {
    const {
      originalTransactionId,
      items = [],
      refundAmount,
      fullReturn,
    } = req.body;

    const originalTx = await Transaction.findById(
      originalTransactionId
    ).populate("items.product customer");
    if (!originalTx)
      return res
        .status(404)
        .json({ message: "Original transaction not found" });

    // Map items for return
    const returnItems = [];

    for (let ri of items) {
      // Find sold item in original transaction
      const soldItem = originalTx.items.find((i) => {
        const originalId = i.product?._id
          ? i.product._id.toString()
          : i.product.toString();
        const returnId = ri.product.toString(); // frontend ID as string
        return originalId === returnId;
      });

      if (!soldItem) {
        console.log(
          "OriginalTx items IDs:",
          originalTx.items.map(
            (i) => i.product?._id?.toString() || i.product.toString()
          )
        );
        console.log("Returned item ID:", ri.product);
        throw new Error(`Product ${ri.product} not found in original sale`);
      }

      // Save item with price
      returnItems.push({
        product: ri.product,
        quantity: ri.quantity,
        price: soldItem.price,
      });

      // Reduce quantity in original transaction
      soldItem.quantity -= ri.quantity;

      // Restore stock
      await Product.findByIdAndUpdate(ri.product, {
        $inc: { stock: ri.quantity },
      });
    }

    // Remove items with 0 quantity
    originalTx.items = originalTx.items.filter((i) => i.quantity > 0);

    // Recalculate totals
    originalTx.total = originalTx.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    if (originalTx.paymentMethod === "cash") {
      originalTx.debit = originalTx.total;
      originalTx.credit = 0;
    } else {
      originalTx.credit = originalTx.total;
      originalTx.debit = 0;
    }

    await originalTx.save();

    // Save return record
    const returnRecord = await Return.create({
      originalTransactionId,
      items: returnItems,
      customer: originalTx.customer || null, // now saves name + phone
      refundAmount,
      fullReturn,
      user: originalTx.customer?._id || null,
    });

    res.status(200).json({
      success: true,
      message: fullReturn
        ? "Full return processed"
        : "Partial return processed",
      returnRecord,
      refundAmount,
      fullReturn,
    });
  } catch (err) {
    console.error("Return Transaction Error:", err);
    res.status(500).json({ message: err.message || "Server error" });
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
