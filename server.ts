import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from "resend";
import twilio from "twilio";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/send-shopping-list", async (req, res) => {
    try {
      const { items, message } = req.body;
      
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Invalid items array" });
      }

      // Input Validation
      if (items.length > 200) {
        return res.status(400).json({ error: "Too many items in list" });
      }

      for (const item of items) {
        if (!item.name || typeof item.name !== 'string' || item.name.length > 200) {
          return res.status(400).json({ error: "Invalid item name" });
        }
        if (typeof item.quantity !== 'number' || isNaN(item.quantity)) {
          return res.status(400).json({ error: "Invalid item quantity" });
        }
        if (item.unit && (typeof item.unit !== 'string' || item.unit.length > 50)) {
          return res.status(400).json({ error: "Invalid item unit" });
        }
      }

      if (message && (typeof message !== 'string' || message.length > 1000)) {
        return res.status(400).json({ error: "Message too long" });
      }

      const formattedList = items.map(item => `- ${item.name}: ${item.quantity} ${item.unit || ''}`).join('\n');
      const fullMessage = `${message || "Here is the shopping list for Chocolate Secrets:"}\n\n${formattedList}`;

      const results = [];

      // Send Email via Resend if configured
      if (process.env.RESEND_API_KEY && process.env.CHEF_EMAIL) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const emailResult = await resend.emails.send({
          from: "Chocolate Secrets <onboarding@resend.dev>",
          to: process.env.CHEF_EMAIL,
          subject: "Shopping List - Chocolate Secrets",
          text: fullMessage,
        });
        results.push({ type: 'email', success: !emailResult.error, data: emailResult });
      }

      // Send SMS via Twilio if configured
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER && process.env.CHEF_PHONE_NUMBER) {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const smsResult = await client.messages.create({
          body: fullMessage,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: process.env.CHEF_PHONE_NUMBER,
        });
        results.push({ type: 'sms', success: true, sid: smsResult.sid });
      }

      if (results.length === 0) {
        return res.status(400).json({ error: "No messaging service configured. Please set RESEND_API_KEY or TWILIO credentials in secrets." });
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Error sending shopping list:", error);
      res.status(500).json({ error: "Failed to send shopping list" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
