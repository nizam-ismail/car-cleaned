import express from "express";
import axios from "axios";
import cors from "cors";
import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("ToyyibPay Callback Server is running ✅");
});

app.post("/toyyibpay/callback", async (req, res) => {
  try {
    const data = req.body;

    await db.collection("payments").add({
      ...data,
      receivedAt: new Date().toISOString(),
    });

    console.log("✅ Payment data received:", data);
    res.status(200).send("Callback received successfully");
  } catch (error) {
    console.error("❌ Error saving callback:", error);
    res.status(500).send("Error processing callback");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`ToyyibPay callback server running on port ${PORT}`));