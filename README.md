# chat_app

Local Chatbot using Node + Python + Ollama. No API key required.

## Prereqs
- Node.js 20+
- Python 3.10+
- Ollama installed and running

## Install Ollama models
```bash
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

## Python service
```bash
cd py_service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## Node server
```bash
npm install
node index.js
```

Open http://localhost:8000

## Notes
- Vercel deploy won't work for local models. Use this project locally.
- Ingest text to improve answers.
