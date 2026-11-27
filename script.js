const chat = document.getElementById("chat");
const input = document.getElementById("input");
let messages = [];

function add(role, text) {
  const d = document.createElement("div");
  d.className = "msg " + role;
  d.textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d;
}

async function send() {
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  add("user", text);
  messages.push({ role: "user", content: text });
  const wait = add("assistant", "...");
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error");
    wait.textContent = data.reply;
    messages.push({ role: "assistant", content: data.reply });
  } catch (e) {
    wait.textContent = "Error: " + e.message;
  }
}

document.getElementById("send").onclick = send;
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});
document.getElementById("clear").onclick = () => { messages = []; chat.innerHTML = ""; };

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const mic = document.getElementById("mic");
if (SR) {
  const rec = new SR();
  rec.onresult = e => { input.value = e.results[0][0].transcript; };
  mic.onclick = () => rec.start();
} else { mic.style.display = "none"; }
