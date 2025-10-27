import express from "express";
import Stripe from "stripe";
import cors from "cors";
import bodyParser from "body-parser";
import admin from "firebase-admin";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Initialize Firebase
try {
  const decodedKey = Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64,
    "base64"
  ).toString("utf8");

  const serviceAccount = JSON.parse(decodedKey);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase initialized successfully");
} catch (err) {
  console.error("❌ Failed to initialize Firebase:", err);
}

const db = admin.firestore();

// ✅ Create Payment Intent
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency = "myr", bookingId } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { bookingId },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("❌ Error creating payment intent:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Stripe Webhook
app.post(
  "/stripe/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata.bookingId;

      if (bookingId) {
        await db.collection("bookings").doc(bookingId).update({
          paymentStatus: "Paid",
          paymentId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
        });
        console.log(`✅ Booking ${bookingId} marked as PAID`);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata.bookingId;

      if (bookingId) {
        await db.collection("bookings").doc(bookingId).update({
          paymentStatus: "Failed",
        });
        console.log(`❌ Booking ${bookingId} marked as FAILED`);
      }
    }

    res.json({ received: true });
  }
);

// ✅ Root Route
app.get("/", (req, res) => res.send("🚀 Stripe Server Running!"));

// ✅ Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
