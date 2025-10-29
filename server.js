import express from "express";
import cors from "cors";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Middleware — jangan parse JSON sebelum webhook!
app.use(cors());

// ✅ Webhook endpoint (raw body dulu)
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log("✅ Webhook verified:", event.type);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ Handle events
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      console.log("💰 Payment succeeded for:", paymentIntent.id);
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      console.log("❌ Payment failed for:", paymentIntent.id);
    } else {
      console.log("ℹ️ Received unhandled event:", event.type);
    }

    res.json({ received: true });
  }
);

// ✅ Parse JSON untuk route lain (selepas webhook)
app.use(express.json());

// ✅ Root route
app.get("/", (req, res) => {
  res.send("🚀 Stripe Payment Server Running ✅");
});

// ✅ Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
