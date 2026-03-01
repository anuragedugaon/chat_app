from __future__ import annotations

import json
import math
import os
from typing import List, Dict

from flask import Flask, request, jsonify
import requests

STORE_PATH = os.path.join(os.path.dirname(__file__), "store.json")
OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

app = Flask(__name__)


def _load_store() -> List[Dict]:
  if not os.path.exists(STORE_PATH):
    return []
  with open(STORE_PATH, "r", encoding="utf-8") as f:
    return json.load(f)


def _save_store(items: List[Dict]) -> None:
  with open(STORE_PATH, "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)


def _embed(text: str) -> List[float]:
  print(f"[embed] model={EMBED_MODEL} chars={len(text)}")
  resp = requests.post(
    OLLAMA_URL,
    json={"model": EMBED_MODEL, "prompt": text},
    timeout=120,
  )
  resp.raise_for_status()
  return resp.json()["embedding"]


def _cosine(a: List[float], b: List[float]) -> float:
  dot = sum(x * y for x, y in zip(a, b))
  na = math.sqrt(sum(x * x for x in a))
  nb = math.sqrt(sum(y * y for y in b))
  if na == 0 or nb == 0:
    return 0.0
  return dot / (na * nb)


def _chunk(text: str, max_len: int = 600) -> List[str]:
  parts = [p.strip() for p in text.split("\n") if p.strip()]
  chunks: List[str] = []
  buf = ""
  for p in parts:
    if len(buf) + len(p) + 1 <= max_len:
      buf = f"{buf}\n{p}".strip()
    else:
      if buf:
        chunks.append(buf)
      buf = p
  if buf:
    chunks.append(buf)
  return chunks


@app.post("/ingest")
def ingest():
  payload = request.get_json(force=True)
  text = (payload.get("text") or "").strip()
  source = payload.get("source") or "manual"
  if not text:
    return jsonify({"error": "text required"}), 400

  store = _load_store()
  chunks = _chunk(text)
  print(f"[ingest] chunks={len(chunks)} source={source}")
  for c in chunks:
    emb = _embed(c)
    store.append({"text": c, "source": source, "embedding": emb})

  _save_store(store)
  return jsonify({"message": f"Ingested {len(chunks)} chunks"})


@app.post("/search")
def search():
  payload = request.get_json(force=True)
  query = (payload.get("query") or "").strip()
  top_k = int(payload.get("top_k") or 4)
  if not query:
    return jsonify({"results": []})

  store = _load_store()
  if not store:
    print("[search] empty store")
    return jsonify({"results": []})

  print(f"[search] query chars={len(query)} top_k={top_k} store={len(store)}")
  q_emb = _embed(query)
  scored = [
    {"score": _cosine(q_emb, item["embedding"]), "text": item["text"], "source": item.get("source")}
    for item in store
  ]
  scored.sort(key=lambda x: x["score"], reverse=True)
  return jsonify({"results": scored[:top_k]})


@app.get("/health")
def health():
  return jsonify({"ok": True})


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5001)
