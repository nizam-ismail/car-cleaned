// server.cjs
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// 🟡 Guna environment variable nanti (jangan hardcode bila deploy Render)
const TOYYIBPAY_SECRET_KEY = "ltbyab4j-3djs-9g1o-yowi-ie54thzqwjbi";
const TOYYIBPAY_CATEGORY_CODE = "li1wgqv6";

// ✅ Create Bill
app.post("/createBill", async (req, res) => {
  try {
    const { name, email, phone, amount, bookingId } = req.body;

    if (!name || !email || !amount) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const form = new URLSearchParams();
    form.append("userSecretKey", TOYYIBPAY_SECRET_KEY);
    form.append("categoryCode", TOYYIBPAY_CATEGORY_CODE);
    form.append("billName", "Langkawi Car Rental Booking");
    form.append("billDescription", "Car Booking Payment");
    form.append("billPriceSetting", 1);
    form.append("billAmount", amount * 100); // RM → sen
    form.append("billReturnUrl", "https://toyyibpay-server.onrender.com/toyyibpay/callback");
    form.append("billCallbackUrl", "https://toyyibpay-server.onrender.com/toyyibpay/callback");
    form.append("billTo", name);
    form.append("billEmail", email);
    form.append("billPhone", phone);

    const response = await axios.post(
      "https://toyyibpay.com/index.php/api/createBill",
      form
    );

    const billCode = response.data[0].BillCode;

    await db.collection("payments").doc(billCode).set({
      bookingId,
      name,
      email,
      phone,
      amount,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      paymentUrl: `https://toyyibpay.com/${billCode}`,
      billCode,
    });
  } catch (error) {
    console.error("ToyyibPay Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Failed to create bill" });
  }
});

// ✅ Callback — update payment status in Firestore
app.post("/toyyibpay/callback", async (req, res) => {
  try {
    const { billcode, status } = req.body;

    if (!billcode) return res.status(400).send("Missing billcode");

    await db.collection("payments").doc(billcode).update({
      status: status === "1" ? "paid" : "failed",
      updatedAt: new Date().toISOString(),
    });

    res.send("Callback received");
  } catch (error) {
    console.error("Callback Error:", error);
    res.status(500).send("Error processing callback");
  }
});

// ✅ Root route just to check if server is alive
app.get("/", (req, res) => {
  res.send("✅ ToyyibPay server is running!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ ToyyibPay callback server running on port ${PORT}`));
