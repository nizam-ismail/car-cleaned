// server.cjs
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const admin = require("firebase-admin");

// ✅ Parse Firebase Admin key dari environment variable
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

// ✅ Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ ToyyibPay Credentials (tak sensitif, boleh kekal hardcoded)
const TOYYIBPAY_SECRET_KEY = "ltbyab4j-3djs-9g1o-yowi-ie54thzqwjbi";
const TOYYIBPAY_CATEGORY_CODE = "li1wgqv6";

// ✅ Create Bill
app.post("/createBill", async (req, res) => {
  try {
    const { name, email, phone, amount, bookingId } = req.body;

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

    const response = await axios.post("https://toyyibpay.com/index.php/api/createBill", form);
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

// ✅ Callback URL
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

// ✅ Server listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ ToyyibPay callback server running on port ${PORT}`));
