const path = require("path");
const express = require("express");

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/api/ingest", async (req, res) => {
  console.log("[/api/ingest] payload keys:", Object.keys(req.body || {}));
  try {
    const resp = await fetch("http://localhost:5001/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });
    console.log("[/api/ingest] python status:", resp.status);
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    console.error("[/api/ingest] error:", err);
    res.status(500).json({ error: "Python service not reachable", detail: String(err) });
  }
});

app.post("/api/chat", async (req, res) => {
  const { messages, top_k = 4 } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  try {
    const last = messages[messages.length - 1];
    const query = last?.content || "";
    console.log("[/api/chat] query:", query.slice(0, 120));

    const retrievalResp = await fetch("http://localhost:5001/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k }),
    });

    console.log("[/api/chat] python status:", retrievalResp.status);
    const retrieval = await retrievalResp.json();
    const context = Array.isArray(retrieval.results)
      ? retrieval.results.map((r, i) => `Source ${i + 1}: ${r.text}`).join("\n\n")
      : "";

    const systemPrompt = `You are a helpful local chatbot. Use the provided context when relevant. If context is missing, answer normally.\n\nContext:\n${context}`;

    const model = process.env.OLLAMA_MODEL || "llama3.2:3b";
    console.log("[/api/chat] ollama model:", model);


    
    const ollamaResp = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    console.log("[/api/chat] ollama status:", ollamaResp.status);
    const ollamaData = await ollamaResp.json();
    res.status(ollamaResp.status).json(ollamaData);
  } catch (err) {
    console.error("[/api/chat] error:", err);
    res.status(500).json({ error: "Chat failed", detail: String(err) });
  }
});

module.exports = app;
