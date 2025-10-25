// server.js
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Decode Base64 Firebase key dari Environment
try {
  const decodedKey = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(decodedKey);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase service account loaded successfully");
} catch (error) {
  console.error("❌ Failed to load Firebase credentials:", error);
}

const db = admin.firestore();

// ✅ Callback route
app.post("/toyyibpay/callback", async (req, res) => {
  try {
    const { billcode, order_id, status } = req.body;
    if (!order_id) return res.status(400).send("Missing order_id");

    await db.collection("bookings").doc(order_id).update({
      paymentStatus: status === "1" ? "Paid" : "Failed",
      updatedAt: new Date().toISOString(),
    });

    res.send("Callback processed ✅");
  } catch (err) {
    console.error("❌ Callback error:", err);
    res.status(500).send("Internal error");
  }
});

app.get("/", (req, res) => res.send("ToyyibPay Callback Server Running ✅"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
