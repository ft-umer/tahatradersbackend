import express from "express";
import Transaction from "../models/Transaction.js";
import PDFDocument from "pdfkit";

const router = express.Router();

/**
 * Assumptions:
 * - Each Transaction document represents either a sale or a payment.
 * - For sales:
 *    - transaction.type === 'sale' OR transaction.items exists (array)
 *    - sale amount is transaction.total (or compute from items)
 *    - Particulars will show "Sale - Invoice #<some id or invoiceNo>"
 * - For payments:
 *    - transaction.type === 'payment' OR no items and transaction.total/amount exists
 *    - payment amount is transaction.total || transaction.amount
 *    - Particulars will show "Payment Received - ID <_id>"
 *
 * If your schema names differ (e.g. transaction.amount, invoiceNo, openingBalance),
 * adjust the property names in "mapTransactionToRow" below.
 */

// REPLACE the existing router.get("/download/:phone", ...) with this implementation
router.get("/download/:phone", async (req, res) => {
  try {
    const phone = req.params.phone;
    const transactions = await Transaction.find({ "customer.phone": phone })
      .sort({ timestamp: 1 })
      .populate("items.product");

    if (!transactions || !transactions.length) {
      return res.status(404).send("No transactions found for this customer");
    }

    const customer = transactions[0].customer || { name: "Unknown", phone };

    // Create PDF doc
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      autoFirstPage: false,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ledger-${phone}.pdf`
    );
    doc.pipe(res);

    // ---------- Helpers ----------
    const formatCurrency = (v) =>
      typeof v === "number" ? v.toFixed(2) : Number(v || 0).toFixed(2);

    const formatDateTime = (ts) => {
      if (!ts) return "-";
      const d = new Date(ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")} ${String(
        d.getHours()
      ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    const mapTransactionToRow = (tx) => {
      const isSale = tx.type === "sale";
      const isPayment = tx.type === "payment";

      let particulars = "";
      let debit = 0;
      let credit = 0;

      if (isSale) {
        const saleAmount = Number(tx.total) || computeTotalFromItems(tx.items);

        debit = saleAmount;

        particulars = tx.invoiceNo
          ? `Sale - Invoice #${tx.invoiceNo}`
          : `Sale - ID ${tx._id.toString().slice(-6)}`;
      } else if (isPayment) {
        const paidAmount = Number(tx.amount || tx.total || 0);

        credit = paidAmount;

        particulars = `Payment Received - ID ${tx._id.toString().slice(-6)}`;
      } else {
        particulars = `Txn - ID ${tx._id.toString().slice(-6)}`;
      }

      return {
        dateTime: tx.timestamp || tx.createdAt || "-",
        particulars,
        debit:tx.debit,
        credit:tx.credit
      };
    };

    function computeTotalFromItems(items = []) {
      if (!Array.isArray(items) || !items.length) return 0;
      return items.reduce((s, it) => {
        const price = it.product?.price ?? it.price ?? 0;
        const qty = it.quantity ?? 1;
        return s + price * qty;
      }, 0);
    }

    // Build rows
    const rows = transactions.map((t) => mapTransactionToRow(t));

    // Optionally compute opening balance if your schema has it
    const openingBalance = transactions[0].openingBalance ?? 0;
    let runningBalance = Number(openingBalance || 0);

    // ---------- Layout Settings ----------
    // We'll create the first page explicitly so we can control header placement consistently
    doc.addPage();
    const pageMargin = doc.page.margins.left; // left & right equal in constructor
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const right = doc.page.margins.right;
    let y = 40;

    // Fonts & sizes (we'll adjust fontSize if space tight)
    const titleFontSize = 16;
    let normalSize = 10;
    const boxTitleSize = 11;
    const minFontSize = 8;
    const defaultRowPadding = 6;

    // Top boxes dimensions
    const boxHeight = 70;
    const boxGap = 10;
    const boxWidth = (pageWidth - boxGap) / 2;

    // Column fixed sizes (date, debit, credit, balance). Particulars will be computed.
    const colDate = 110;
    const colDebit = 80;
    const colCredit = 80;
    const colBalance = 90;

    // Calculate particulars width (remaining)
    let particularsWidth =
      pageWidth - (colDate + colDebit + colCredit + colBalance);
    if (particularsWidth < 120) {
      // If particulars area too small, reduce fixed columns (prefer reduce date)
      const overflow = 120 - particularsWidth;
      const reduceFromDate = Math.min(overflow, 30);
      particularsWidth = particularsWidth + reduceFromDate;
      // if still small, reduce debit/credit a bit
      if (particularsWidth < 120) {
        const extraNeeded = 120 - particularsWidth;
        const reduceEach = Math.ceil(extraNeeded / 3);
        // reduce fixed widths safely
        // don't reduce below sensible minima
        const minDate = 80,
          minDebit = 60,
          minCredit = 60,
          minBalance = 60;
        const newDate = Math.max(minDate, colDate - reduceEach);
        const newDebit = Math.max(minDebit, colDebit - reduceEach);
        const newCredit = Math.max(minCredit, colCredit - reduceEach);
        const newBalance = Math.max(minBalance, colBalance - reduceEach);
        // recompute particularsWidth with adjusted fixed columns
        particularsWidth =
          pageWidth - (newDate + newDebit + newCredit + newBalance);
        // update fixed
        // (keep the adjusted values)
        // NOTE: we cannot reassign consts; so we'll collect widths object below.
        // Continue below.
      }
    }

    // Use a widths object that we can adjust if needed
    const widths = {
      dateTime: colDate,
      particulars: Math.max(120, particularsWidth),
      debit: colDebit,
      credit: colCredit,
      balance: colBalance,
    };

    // Ensure final sum equals pageWidth by shrinking particulars if small rounding differences
    const sumFixed =
      widths.dateTime + widths.debit + widths.credit + widths.balance;
    widths.particulars = Math.max(80, pageWidth - sumFixed);

    const drawTopBoxes = (yPos) => {
      const headerTop = yPos;

      // Left box (Account Of)
      doc.rect(left, headerTop, boxWidth, boxHeight).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(boxTitleSize)
        .text("Account Of", left + 8, headerTop + 6);
      doc
        .font("Helvetica")
        .fontSize(normalSize)
        .text(customer.name || "-", left + 8, headerTop + 24);
      if (customer.contact)
        doc.text(`Contact: ${customer.contact}`, left + 8, headerTop + 38);
      else if (customer.phone)
        doc.text(`Contact: ${customer.phone}`, left + 8, headerTop + 38);

      // Right box (Account Summary)
      const rightBoxX = left + boxWidth + boxGap;
      doc.rect(rightBoxX, headerTop, boxWidth, boxHeight).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(boxTitleSize)
        .text("Account Summary", rightBoxX + 8, headerTop + 6);

      // Compute totals for summary
      let totalDebit = 0,
        totalCredit = 0;
      rows.forEach((r) => {
        totalDebit += r.debit;
        totalCredit += r.credit;
      });
      const computedBalance =
        Number(openingBalance || 0) + totalCredit;

      const balanceLabel =
        computedBalance > 0
          ? "Receivable"
          : computedBalance < 0
          ? "Payable"
          : "Settled";

      doc
        .font("Helvetica")
        .fontSize(normalSize)
        .text(
          `Current Balance: (${formatCurrency(
            Math.abs(computedBalance)
          )}) (${balanceLabel})`,
          rightBoxX + 8,
          headerTop + 24
        );

      doc
        .fontSize(9)
        .text(
          `DateTime: ${formatDateTime(new Date())}`,
          rightBoxX + 8,
          headerTop + 40
        );
    };

    // Draw initial top boxes
    drawTopBoxes(y);
    y += boxHeight + 20;

    // ---------- Table header drawer ----------
    const rowSpacing = 6;
    const headerRowHeight = 22;
    const drawTableHeader = (yPos) => {
      // header background
      doc.rect(left, yPos, pageWidth, headerRowHeight).fill("#4F81BD");
      doc.fillColor("white").font("Helvetica-Bold").fontSize(normalSize);

      const headY = yPos + headerRowHeight / 2 - normalSize / 2 - 1;
      doc.text("DateTime", left + 6, headY, { width: widths.dateTime - 10 });
      doc.text("Particulars", left + widths.dateTime + 6, headY, {
        width: widths.particulars - 10,
      });
      doc.text(
        "Debit",
        left + widths.dateTime + widths.particulars + 6,
        headY,
        { width: widths.debit - 8, align: "right" }
      );
      doc.text(
        "Credit",
        left + widths.dateTime + widths.particulars + widths.debit + 6,
        headY,
        { width: widths.credit - 8, align: "right" }
      );
      doc.text(
        "Balance",
        left +
          widths.dateTime +
          widths.particulars +
          widths.debit +
          widths.credit +
          6,
        headY,
        { width: widths.balance - 8, align: "right" }
      );

      doc.fillColor("black");
      return headerRowHeight;
    };

    // draw initial table header
    y += drawTableHeader(y);

    // ---------- Row drawing with wrapping and dynamic height ----------
    const bottomLimit = () => doc.page.height - doc.page.margins.bottom;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      // Compute running balance for this row (we need it to show)
      runningBalance = runningBalance + r.credit;

      // prepare fonts for measurement
      doc.font("Helvetica").fontSize(normalSize);

      // compute heights for each cell (we mainly need particulars height)
      const dateText = formatDateTime(r.dateTime);
      const particularsText = r.particulars;
      const debitText = r.debit ? formatCurrency(r.debit) : "-";
      const creditText = r.credit ? formatCurrency(r.credit) : "-";
      const balanceText = formatCurrency(Math.abs(runningBalance));

      // measure heights using heightOfString for wrapped particulars
      const particularsEffectiveWidth = widths.particulars - 10; // small padding
      const dateHeight = doc.heightOfString(dateText, {
        width: widths.dateTime - 10,
      });
      const particularsHeight = doc.heightOfString(particularsText, {
        width: particularsEffectiveWidth,
      });
      const debitHeight = doc.heightOfString(debitText, {
        width: widths.debit - 8,
      });
      const creditHeight = doc.heightOfString(creditText, {
        width: widths.credit - 8,
      });
      const balanceHeight = doc.heightOfString(balanceText, {
        width: widths.balance - 8,
      });

      // rowHeight is the max of all cell heights plus padding
      const computedRowHeight =
        Math.max(
          dateHeight,
          particularsHeight,
          debitHeight,
          creditHeight,
          balanceHeight
        ) +
        defaultRowPadding * 2;

      // If not enough space on page, add new page and re-draw header (and top boxes)
      if (y + computedRowHeight + 40 > bottomLimit()) {
        doc.addPage();
        // reset y to top margin
        y = doc.page.margins.top;
        // Draw top boxes and move y down
        drawTopBoxes(y);
        y += boxHeight + 20;
        // draw table header again
        y += drawTableHeader(y);
      }

      // Optional alternate shading
      if (i % 2 === 1) {
        doc.rect(left, y, pageWidth, computedRowHeight).fill("#F2F2F2");
      }

      // Draw cell borders (top border) - lighter line
      doc.lineWidth(0.5).rect(left, y, pageWidth, computedRowHeight).stroke();

      // Draw vertical separators
      let x = left + widths.dateTime;
      doc
        .moveTo(x, y)
        .lineTo(x, y + computedRowHeight)
        .stroke();
      x += widths.particulars;
      doc
        .moveTo(x, y)
        .lineTo(x, y + computedRowHeight)
        .stroke();
      x += widths.debit;
      doc
        .moveTo(x, y)
        .lineTo(x, y + computedRowHeight)
        .stroke();
      x += widths.credit;
      doc
        .moveTo(x, y)
        .lineTo(x, y + computedRowHeight)
        .stroke();

      // Write text with vertical padding
      const textY = y + defaultRowPadding;
      doc.fillColor("black").font("Helvetica").fontSize(normalSize);

      // Date (left aligned)
      doc.text(dateText, left + 6, textY, { width: widths.dateTime - 10 });

      // Particulars (wrap)
      doc.text(particularsText, left + widths.dateTime + 6, textY, {
        width: particularsEffectiveWidth,
        align: "left",
      });

      // Debit (right)
      doc.text(
        r.debit ? formatCurrency(r.debit) : "-",
        left + widths.dateTime + widths.particulars + 6,
        textY,
        { width: widths.debit - 8, align: "right" }
      );

      // Credit (right)
      doc.text(
        r.credit ? formatCurrency(r.credit) : "-",
        left + widths.dateTime + widths.particulars + widths.debit + 6,
        textY,
        { width: widths.credit - 8, align: "right" }
      );

      // Balance (right)
      doc.text(
        balanceText,
        left +
          widths.dateTime +
          widths.particulars +
          widths.debit +
          widths.credit +
          6,
        textY,
        { width: widths.balance - 8, align: "right" }
      );

      // advance y
      y += computedRowHeight;
    }

    // ---------- Summary Section ----------
    // leave some gap
    y += 12;
    if (y + 120 > bottomLimit()) {
      doc.addPage();
      y = doc.page.margins.top;
      drawTopBoxes(y);
      y += boxHeight + 20;
      y += drawTableHeader(y);
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(
        `Closing Balance: (${formatCurrency(Math.abs(runningBalance))})`,
        left,
        y
      );
    y += 18;

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        `Total Number of Credit Transactions: ${
          rows.filter((r) => r.credit > 0).length
        }`,
        left,
        y
      );
    y += 14;
    doc.text(
      `Total Number of Debit Transactions: ${
        rows.filter((r) => r.debit > 0).length
      }`,
      left,
      y
    );
    y += 14;
    // recompute totals for display
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);

    // 🔴 Credit in RED
    doc.font("Helvetica-Bold");
    doc
      .fillColor("red")
      .text(`Total Amount Remaining (Credit): ${formatCurrency(totalCredit)}`, left, y);

    y += 14;

    // 🔁 Reset to GREEN
    doc.font("Helvetica-Bold");
    doc
      .fillColor("green")
      .text(`Total Amount Paid (Debit): ${formatCurrency(totalDebit)}`, left, y);

    y += 18;
    // 🔁 Reset to BLACK
    doc.font("Helvetica");
    doc.fillColor("black");
    doc.text(`Generated on: ${formatDateTime(new Date())}`, left, y);

    doc.end();
  } catch (err) {
    console.error("Ledger PDF error:", err);
    res.status(500).send("Failed to generate ledger PDF");
  }
});

/* ========================================================
   GENERATE WHATSAPP LEDGER LINK
   ======================================================== */
router.post("/send", async (req, res) => {
  try {
    const { orderId, customerPhone } = req.body;

    let phone;
    let customerName;

    if (orderId) {
      const order = await Transaction.findById(orderId);
      if (!order) return res.status(404).json({ message: "Order not found" });
      phone = order.customer.phone;
      customerName = order.customer.name;
    } else if (customerPhone) {
      phone = customerPhone;
      // Fetch customer name from first transaction (optional)
      const txn = await Transaction.findOne({ "customer.phone": phone });
      customerName = txn?.customer?.name || "Customer";
    } else {
      return res
        .status(400)
        .json({ message: "Order ID or Customer phone required" });
    }
    const txns = await Transaction.find({ "customer.phone": phone });
    const totalCredit = txns.reduce((s, t) => s + (t.credit || 0), 0);
    const totalDebit = txns.reduce((s, t) => s + (t.debit || 0), 0);
    const closingBalance = Number(totalCredit || 0);

    const rawPhone = phone.replace(/\D/g, "");
    const waPhone = rawPhone.startsWith("0")
      ? "92" + rawPhone.slice(1)
      : rawPhone;

    const downloadUrl = `https://hb-backend-black.vercel.app/api/ledger/download/${encodeURIComponent(
      phone
    )}`;
    const capitalize = (name = "") =>
      name
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    const message =
      `Assalam u Alaikum ${capitalize(
        customerName
      )}, your ledger is ready.\n\n` +
      `Closing Balance: (${Math.abs(closingBalance).toFixed(2)})\n` +
      `Total Amount Remaining (Credit): ${totalCredit.toFixed(2)}\n` +
      `Total Amount Paid (Debit): ${totalDebit.toFixed(2)}\n\n` +
      `Download here: ${downloadUrl}`;

    const waURL = `https://wa.me/${waPhone}?text=${encodeURIComponent(
      message
    )}`;
    res.json({ url: waURL });
  } catch (err) {
    console.error("WhatsApp Link Error:", err);
    res.status(500).json({ message: "Failed to generate ledger link" });
  }
});

export default router;
