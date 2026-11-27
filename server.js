require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM = "You are PRAMOD AI, a helpful personal assistant. Reply in the same language the user writes (Nepali, English or Japanese). Be clear and concise.";

app.post("/api/chat", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY set gareko chaina." });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const history = Array.isArray(req.body.messages) ? req.body.messages.slice(-20) : [];
  const contents = history.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content || "") }]
  }));
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents })
      }
    );
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || "Gemini error" });
    const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: "Server error: " + e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("PRAMOD AI running on port " + PORT));
