# Legal AI - Intelligent Contract Analysis Platform ⚖️

> **De-mystifying legal documents with AI.**
Legal AI is a powerful web application that automates the analysis of complex legal contracts. Using advanced Natural Language Processing (NLP) and Google's Gemini AI models, it helps users understand agreements, identify risks, and translate legalese into plain English.

![Legal AI Dashboard](/web_app/public/assets/img/banner-bg.png)

## 🚀 Key Features

- **📄 Smart Document Analysis**: Upload any PDF or text contract. The AI reads and understands the full context.
- **❓ Contract Q&A**: Ask specific questions (e.g., "What is the termination clause?") and get instant, accurate answers cited from the document.
- **⚠️ Risk Analysis**: Automatically detects potential legal loopholes, liabilities, and risky clauses, providing both a summary and a detailed breakdown.
- **✍️ Legalese Paraphraser**: Highlights complex legal jargon and translates it into simple, easy-to-understand language.
- **📱 Responsive Design**: Fully optimized for desktop, tablet, and mobile devices.

## 🛠️ Tech Stack

- **Frontend**: Next.js (React), Typescript, Bootstrap 5, Custom CSS
- **Backend**: Flask (Python)
- **AI Engine**: Google Gemini API (`gemini-2.0-flash-lite`)
- **Containerization**: Docker

## 🏁 Getting Started

Follow these instructions to run the project locally.

### Prerequisites

- Node.js (v16+)
- Python (v3.9+)
- A Google Cloud API Key for Gemini

### 1. Backend Setup (Flask)

Navigate to the server directory:

```bash
cd flask_server
```

Create a virtual environment (optional but recommended):

```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

**Configuration:**
Create a `.env` file in `flask_server/` and add your API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

Start the server:

```bash
python app.py
```
> The backend will run on `http://127.0.0.1:5000`

### 2. Frontend Setup (Next.js)

Open a new terminal and navigate to the web app directory:

```bash
cd web_app
```

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm run dev
```
> The frontend will run on `http://localhost:3000`

## 🐳 Docker Support

To run the entire stack with Docker:

```bash
docker-compose up --build
```

## 📝 License

This project is licensed under the MIT License.

---
**Legal Disclaimer**: This tool is for informational purposes only and does not constitute professional legal advice. Always consult with a qualified attorney for legal matters.
