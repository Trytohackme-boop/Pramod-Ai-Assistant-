require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
app.use(express.json({ limit: "1mb" }));

// Sirf 3 public files dekhaune (server.js / package.json hoina)
["index.html", "style.css", "script.js"].forEach(f => {
  const route = f === "index.html" ? ["/", "/index.html"] : ["/" + f];
  app.get(route, (req, res) => res.sendFile(path.join(__dirname, f)));
});
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM = "You are PRAMOD AI, a helpful personal assistant. Reply in the same language the user writes (Nepali, English or Japanese). Be clear and concise.";

async function askGemini(contents) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) throw new Error("GEMINI_API_KEY Render Environment ma set gareko chaina.");
  const model = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 40000);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents }),
        signal: ctrl.signal
      }
    );
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = `Gemini ${r.status} (model: ${model}): ${data.error?.message || "unknown error"}`;
      console.error(msg);
      throw new Error(msg);
    }
    const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    if (!reply) throw new Error("Gemini le khali jawaf dayo.");
    return reply;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Gemini le 40 second ma jawaf dayena (timeout).");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Browser ma kholera test garna: /api/test
app.get("/api/test", async (req, res) => {
  try {
    const reply = await askGemini([{ role: "user", parts: [{ text: "Say hello in one short sentence." }] }]);
    res.type("text").send("OK: " + reply);
  } catch (e) {
    res.status(500).type("text").send("ERROR: " + e.message);
  }
});

app.post("/api/chat", async (req, res) => {
  const history = Array.isArray(req.body.messages) ? req.body.messages.slice(-20) : [];
  const contents = history.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content || "") }]
  }));
  try {
    res.json({ reply: await askGemini(contents) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("PRAMOD AI running on port " + PORT));