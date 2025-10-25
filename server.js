// server.js
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Decode Base64 Firebase key dari Environment
const decodedKey = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
const serviceAccount = JSON.parse(decodedKey);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ✅ ToyyibPay Callback
app.post("/toyyibpay/callback", async (req, res) => {
  try {
    console.log("✅ ToyyibPay Callback Received:", req.body);

    const { billcode, order_id, status, amount, refno, transaction_time, buyerEmail } = req.body;
    if (!order_id) return res.status(400).json({ success: false, message: "Missing order_id" });

    const bookingRef = db.collection("bookings").doc(order_id);
    await bookingRef.update({
      paymentStatus: status === "1" ? "Paid" : "Failed",
      paymentInfo: { billcode, refno, transaction_time, amount, buyerEmail },
    });

    console.log(`💰 Booking ${order_id} updated to ${status === "1" ? "Paid" : "Failed"}`);
    return res.status(200).send("Callback processed successfully");
  } catch (error) {
    console.error("❌ Error processing callback:", error);
    return res.status(500).send("Internal Server Error");
  }
});

app.get("/", (req, res) => {
  res.send("ToyyibPay Callback Server Running ✅");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
