# AI Governance Dashboard

Welcome to Fairness Scanner — a full-stack AI governance interface for identifying and mitigating fairness risks in machine learning and LLM systems.

This project includes:

- ✅ A modern **Next.js** frontend for dataset upload and visual analysis
- ✅ A lightweight **FastAPI backend** powered by **Giskard** for automated fairness evaluation
- ✅ Optional support for **MinIO**, **Spark**, and **Dremio** for scalable data lake integration

---

## 🚀 Features

- 📂 Upload CSV or Excel datasets via the web UI
- 🔍 Automatically detect protected attributes (e.g., gender, age, race)
- ⚖️ Run fairness diagnostics using Giskard
- 📊 Visualize results and trigger mitigation workflows
- ☁️ Optional support for S3-compatible object storage (MinIO)
- 🔌 Extendable to integrate with Flink, Spark, Dremio, and LLM agents

---

## 🗂️ Project Structure

```bash
├── frontend/         # Next.js (React) frontend
│   ├── app/
│   ├── lib/
│   ├── components/
│   ├── public/
│   └── ...
├── backend/          # FastAPI + Giskard backend
│   ├── main.py
│   ├── upload.py
│   └── requirements.txt
├── setup.sh          # Dev environment setup script
└── README.md
```

## 🌐 Environment Variables

Specify the backend endpoint for the frontend using `NEXT_PUBLIC_API_URL` in `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

This value is read by the browser when uploading datasets.
