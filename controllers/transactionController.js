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

export const addPaymentAgainstInvoice = async (req, res) => {
  try {
    const { invoiceNo, amount, paymentMethod = "received", customer } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    let customerData = customer;
    let user;

    // 🔹 If invoiceNo provided → derive customer
    if (invoiceNo) {
      const sale = await Transaction.findOne({
        invoiceNo,
        type: "sale",
      });

      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      customerData = sale.customer;
      user = sale.user;
    }

    // 🔹 If no invoiceNo → customer is mandatory
    if (!customerData) {
      return res.status(400).json({ message: "Customer is required" });
    }

    const paymentTx = await Transaction.create({
      type: "payment",
      invoiceNo: invoiceNo || null, // optional
      total: amount,
      paymentMethod,
      debit: amount,   // ✅ payment reduces balance
      credit: 0,
      customer: customerData,
      user,
    });

    res.status(201).json(paymentTx);
  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ message: "Failed to add payment" });
  }
};

export const addCreditAgainstInvoice = async (req, res) => {
  try {
    const { invoiceNo, amount, customer } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid credit amount" });
    }

    let customerData = customer;
    let user;

    // 🔹 Invoice-based credit
    if (invoiceNo) {
      const sale = await Transaction.findOne({
        invoiceNo,
        type: "sale",
      });

      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      customerData = sale.customer;
      user = sale.user;
    }

    // 🔹 Customer-based credit (Trial Balance)
    if (!customerData) {
      return res.status(400).json({ message: "Customer is required" });
    }

    const creditTx = await Transaction.create({
      type: "payment",
      invoiceNo: invoiceNo || null,
      total: amount,
      paymentMethod: "credit",
      debit: 0,
      credit: amount, // ✅ customer owes
      customer: customerData,
      user,
    });

    res.status(201).json(creditTx);
  } catch (err) {
    console.error("Credit error:", err);
    res.status(500).json({ message: "Failed to add credit" });
  }
};



// UPDATE TRANSACTION
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      debit,
      credit,
      cash,
      online,
      paymentMethod: pm,
      customer,
    } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction)
      return res.status(404).json({ message: "Transaction not found" });

    // ✅ KEEP OLD METHOD IF NOT SENT
    let finalPaymentMethod = pm ?? transaction.paymentMethod;

    let finalDebit = debit !== undefined ? debit : transaction.debit;

    let finalCredit = credit !== undefined ? credit : transaction.credit;

    let finalCash = transaction.cash;
    let finalOnline = transaction.online;

    // ❌ Prevent invalid accounting
    if ((debit || 0) > 0 && (credit || 0) > 0) {
      return res
        .status(400)
        .json({ message: "Debit and credit cannot both be greater than 0" });
    }

    const total = transaction.total;

    if (pm) {
      if (pm === "split") {
        const cashVal = cash || 0;
        const onlineVal = online || 0;
        const creditVal = credit || 0;

        if (cashVal + onlineVal + creditVal !== total) {
          return res.status(400).json({
            message: "Cash + Online + Credit must equal total",
          });
        }

        finalCash = cashVal;
        finalOnline = onlineVal;
        finalDebit = cashVal + onlineVal;
        finalCredit = creditVal;
      } else if (pm === "cash") {
        finalCash = total;
        finalDebit = total;
        finalOnline = 0;
        finalCredit = 0;
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

    // Update customer
    if (customer) {
      transaction.customer = {
        ...transaction.customer,
        ...customer,
      };
    }

    transaction.paymentMethod = finalPaymentMethod;
    transaction.debit = finalDebit;
    transaction.credit = finalCredit;
    transaction.cash = finalCash;
    transaction.online = finalOnline;

    await transaction.save();

    res.status(200).json({ success: true, transaction });
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
    const returns = await Transaction.find({ type: "return" })
      .populate("items.product", "name price")
      .populate("user", "name phone")
      .sort({ createdAt: -1 });

    res.json({ success: true, returns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


export const returnTransaction = async (req, res) => {
  try {
    const { originalTransactionId, items, refundAmount, fullReturn } = req.body;

    const originalSale = await Transaction.findById(originalTransactionId);

    if (!originalSale || originalSale.type !== "sale") {
      return res.status(404).json({ message: "Original sale not found" });
    }

    // ✅ CREATE A NEW TRANSACTION (IMPORTANT)
    const returnTxn = await Transaction.create({
      type: "return",
      invoiceNo: originalSale.invoiceNo,
      originalTransactionId: originalSale._id,

      items: items.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        price:
          originalSale.items.find((oi) => oi.product.toString() === i.product)
            ?.price || 0,
      })),

      total: refundAmount,
      refundAmount,
      fullReturn,

      // 🔴 RETURN IS DEBIT (WE PAY CUSTOMER)
      debit: refundAmount,
      credit: 0,

      paymentMethod: "cash", // or "received" / "online"

      customer: {
        id: originalSale.customer.id,
        name: originalSale.customer.name,
        phone: originalSale.customer.phone,
        address: originalSale.customer.address,
      },

      user: req.user._id,
    });

    // 🔁 RESTORE STOCK ON RETURN
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

 /* ---------------- UPDATE ORIGINAL SALE ITEMS ---------------- */
    originalSale.items = originalSale.items
      .map((saleItem) => {
        const returnedItem = items.find(
          (ri) => ri.product === saleItem.product.toString()
        );

        if (!returnedItem) return saleItem;

        return {
          ...saleItem.toObject(),
          quantity: saleItem.quantity - returnedItem.quantity,
        };
      })
      .filter((item) => item.quantity > 0); // remove zero qty items

    /* OPTIONAL: mark sale as fully returned */
    if (fullReturn || originalSale.items.length === 0) {
      originalSale.status = "returned"; // only if you have this field
    }
  await originalSale.save();

    // ❌ DO NOT MODIFY originalSale
    // ❌ DO NOT UPDATE debit/credit of originalSale

    res.status(201).json({
      message: fullReturn
        ? "Full return processed"
        : "Partial return processed",
      returnTransaction: returnTxn,
    });
  } catch (err) {
    console.error("Return error:", err);
    res.status(500).json({ message: "Return failed" });
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
