require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors({ origin: true }));
app.use(express.json({ limit: "100kb" }));

const analyticsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  totalSeconds: Number,
  productiveSeconds: Number,
  distractingSeconds: Number,
  neutralSeconds: Number,
  switches: Number,
  domains: mongoose.Schema.Types.Mixed,
  hourly: mongoose.Schema.Types.Mixed,
  sessions: Number,
  updatedAt: { type: Date, default: Date.now }
});
const Analytics = mongoose.models.Analytics || mongoose.model("Analytics", analyticsSchema);
const memoryStore = new Map();
let databaseConnected = false;

app.get("/api/status", (_req, res) => {
  res.json({
    status: "ok",
    database: databaseConnected ? "MongoDB connected" : "temporary memory storage",
    message: "MindTrace analytics API is running"
  });
});

app.post("/api/analytics", async (req, res) => {
  const data = req.body || {};
  if (typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return res.status(400).json({ error: "A valid date is required." });
  }
  const safe = {
    date: data.date,
    totalSeconds: Math.max(0, Number(data.totalSeconds) || 0),
    productiveSeconds: Math.max(0, Number(data.productiveSeconds) || 0),
    distractingSeconds: Math.max(0, Number(data.distractingSeconds) || 0),
    neutralSeconds: Math.max(0, Number(data.neutralSeconds) || 0),
    switches: Math.max(0, Number(data.switches) || 0),
    domains: data.domains && typeof data.domains === "object" ? data.domains : {},
    hourly: data.hourly && typeof data.hourly === "object" ? data.hourly : {},
    sessions: Math.max(0, Number(data.sessions) || 0),
    updatedAt: new Date()
  };

  try {
    if (databaseConnected) {
      await Analytics.findOneAndUpdate({ date: safe.date }, { $set: safe }, { upsert: true });
    } else {
      memoryStore.set(safe.date, safe);
    }
    res.json({ ok: true, storage: databaseConnected ? "mongodb" : "memory" });
  } catch (error) {
    console.error("Analytics save failed:", error.message);
    res.status(500).json({ error: "Could not save analytics." });
  }
});

app.get("/api/analytics/:date", async (req, res) => {
  try {
    const result = databaseConnected
      ? await Analytics.findOne({ date: req.params.date }).lean()
      : memoryStore.get(req.params.date);
    if (!result) return res.status(404).json({ error: "No analytics found for this date." });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Could not load analytics." });
  }
});

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      databaseConnected = true;
      console.log("MongoDB connected.");
    } catch (error) {
      console.error("MongoDB connection failed; using temporary memory storage:", error.message);
    }
  } else {
    console.log("MONGODB_URI not configured; using temporary memory storage.");
  }
  app.listen(PORT, () => console.log(`MindTrace API running at http://localhost:${PORT}`));
}
start();
