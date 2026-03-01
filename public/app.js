const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const kb = document.getElementById("kb");
const ingestBtn = document.getElementById("ingest");
const statusEl = document.getElementById("status");

const messages = [];

function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    if (res.ok) {
      statusEl.textContent = "Node OK · Python + Ollama needed";
      return;
    }
  } catch {}
  statusEl.textContent = "Backend not running";
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  messages.push({ role: "user", content: text });
  addMessage("user", text);

  const loading = document.createElement("div");
  loading.className = "msg bot";
  loading.textContent = "Thinking…";
  chat.appendChild(loading);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    const reply = data?.message?.content || data?.error || "No response";
    loading.remove();
    messages.push({ role: "assistant", content: reply });
    addMessage("bot", reply);
  } catch (err) {
    loading.textContent = "Error connecting to backend";
  }
}

async function ingestNotes() {
  const text = kb.value.trim();
  if (!text) return;
  ingestBtn.textContent = "Ingesting…";
  try {
    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source: "manual" }),
    });
    const data = await res.json();
    addMessage("bot", data?.message || "Ingested");
    kb.value = "";
  } catch {
    addMessage("bot", "Ingest failed. Is Python service running?");
  } finally {
    ingestBtn.textContent = "Ingest Notes";
  }
}

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
ingestBtn.addEventListener("click", ingestNotes);

checkHealth();
addMessage("bot", "Hello! Start by asking a question, or paste notes below to build knowledge.");
