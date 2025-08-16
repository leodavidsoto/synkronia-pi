// server/server.js (Express 5 compatible)
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();

// --- Middlewares ---
app.use(cors());
app.use(bodyParser.json());

// --- DB helpers ---
const DB_PATH = path.join(__dirname, "db.json");

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    const init = { cards: [], receipts: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
  }
}
function readDB() {
  ensureDB();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    const init = { cards: [], receipts: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
    return init;
  }
}
function writeDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

// --- API ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/cards", (_req, res) => {
  const db = readDB();
  res.json(db.cards || []);
});

app.post("/api/cards", (req, res) => {
  const { username, talent, seeking, tags } = req.body || {};
  if (!username || !talent || !seeking) {
    return res.status(400).json({ error: "Faltan campos: username, talent, seeking" });
  }
  const db = readDB();
  db.cards = db.cards || [];
  db.cards = db.cards.filter(c => !(c.username === username && c.talent === talent && c.seeking === seeking));
  db.cards.unshift({ username, talent, seeking, tags, ts: Date.now() });
  writeDB(db);
  res.json({ ok: true, cards: db.cards });
});

// Pagos (placeholders para callbacks del Pi SDK)
app.post("/api/pay/approve", (req, res) => {
  const { paymentId } = req.body || {};
  if (!paymentId) return res.status(400).json({ error: "paymentId requerido" });
  console.log("Approve (demo) paymentId:", paymentId);
  res.json({ ok: true, message: "Approved (demo)" });
});

app.post("/api/pay/complete", (req, res) => {
  const { paymentId, txid, rate = 5, note = "" } = req.body || {};
  if (!paymentId) return res.status(400).json({ error: "paymentId requerido" });
  const db = readDB();
  db.receipts = db.receipts || [];
  db.receipts.unshift({
    id: `rcpt_${Date.now()}`,
    paymentId,
    txid: txid || "txid_demo",
    rating: Number(rate),
    note,
    signedBy: "synkronia-pi-demo-server",
    ts: Date.now(),
  });
  writeDB(db);
  res.json({ ok: true, message: "Pago completado y reputación registrada" });
});

app.get("/api/receipts", (_req, res) => {
  const db = readDB();
  res.json(db.receipts || []);
});

// --- Servir frontend build (Vite) desde :4000 ---
const distPath = path.join(__dirname, "../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Catch-all que excluye /api usando regex (Express 5)
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  console.warn("[WARN] No se encontró ../client/dist. Corre 'npm run build' dentro de client para servir el frontend desde :4000.");
}

// --- Start ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
