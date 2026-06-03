# 🤖 FWC Nexus — AI-Based HR Module (v3.0)

**FWC Nexus** is a production-grade, AI-driven human resource recruitment and onboarding platform. It features complete Role-Based Access Control (RBAC), intelligent resume parsing & semantic scoring, an AST-based coding playground, automated interview sentiment evaluation, and a real-time WebSocket AI Co-pilot for talent acquisition teams.

---

## 🌟 Core Features

### 1. 👥 Role-Based Access Control (RBAC)
The application defines three distinct hierarchical user roles:
*   **Candidate**: Can update profiles, upload resumes, undergo interactive coding & Q&A interviews, track job applications, and complete onboarding tasks.
*   **Recruiter**: Full visibility into the recruitment pipeline, candidate profiles, and resume screening analytics. Equipped with an AI assistant and job description (JD) generator.
*   **Admin**: System administrator with full read/write privileges over all pipelines and user accounts.

### 2. 📄 AI-Powered Resume Parser & Screener
*   **PDF Extraction**: Utilizes `pypdf` to parse uploaded candidate resumes.
*   **Entity Extraction**: Extracts candidate name/email using `spaCy` Named Entity Recognition (NER), falling back gracefully to optimized regex.
*   **Semantic Matching**: Employs `sentence-transformers` to compute a cosine similarity score between the candidate's skills and the active Job Description (JD).
*   **Fake Resume Detection**: Scans resumes for abnormal repetitions or stuffed keywords to flag anomalous applications.

### 3. 💻 AI Technical Sandbox (AST-based)
*   Integrates an interactive coding workspace where candidates solve challenges (e.g., Vector Dot Product).
*   Analyzes python code on-the-fly using the Python **Abstract Syntax Tree (AST)** to compute:
    *   **McCabe Cyclomatic Complexity** (logical nesting score).
    *   **Time & Space Big-O Complexity** estimations (detecting recursion and loop depth).
    *   **Functional Logic Checks** (e.g., verifying multiplication and accumulation logic).

### 4. 🎙️ Automated Q&A Interview & Sentiment Analyzer
*   Measures accuracy and clarity of candidate answers.
*   Employs HuggingFace `transformers` (DistilBERT sentiment analysis model) to evaluate candidate sentiment (e.g., confident, hesitant, positive, negative).
*   Monitors and records tab switches and fullscreen violations to discourage plagiarism.

### 5. 💬 Real-Time AI Co-Pilot (WebSockets)
*   Provides recruiters with a live WebSocket chatbot powered by an NLP query processor.
*   Recruiters can query the bot using natural language (e.g., *"Who is our top candidate?"*, *"Who has Python skills?"*, *"Show pipeline stats"*).

### 6. 📋 Onboarding Funnel Dashboard
*   Automatically tracks a checklist of 6 key onboarding tasks for hired candidates.
*   Visualizes completion percentages and progress bars on the candidate's dashboard.

---

## 🛠️ Technology Stack

*   **Backend**: Python, FastAPI, SQLAlchemy ORM, Uvicorn ASGI Server
*   **Database**: SQLite (default, zero-configuration) or PostgreSQL (production-ready)
*   **Security & Auth**: PyJWT (JSON Web Tokens), PBKDF2 Password Hashing
*   **AI/NLP Stack**: `spaCy`, `sentence-transformers`, `transformers`, `torch`
*   **Frontend**: Vanilla HTML5, CSS3, JavaScript (Static files mounted on `/`)

---

## 📂 Project Structure

```text
├── app/
│   ├── auth.py          # JWT generation, validation, and user session management
│   ├── database.py      # SQLite / PostgreSQL engine config and session factory
│   ├── db_models.py     # SQLAlchemy schemas (Users, Candidates, JobPostings, Applications, etc.)
│   ├── main.py          # Main FastAPI endpoints, router bindings, and WebSockets
│   ├── models.py        # Core AI algorithms, AST evaluation, resume screening, NLP chatbot
│   ├── role_utils.py    # Hierarchical RBAC helper utilities
│   ├── schemas.py       # Pydantic request/response validation schemas
│   └── db.json          # Mock seed data backup
├── public/
│   ├── css/             # Styling stylesheets
│   ├── js/              # Client-side API hooks, layout managers, and custom components
│   ├── index.html       # Main Application Dashboard template
│   ├── login.html       # Authentication UI
│   └── uploads/         # Destination folder for uploaded candidate PDFs
├── requirements.txt     # Locked production python dependencies
├── run.py               # Application startup entry point
└── .env                 # Environment variables config
```

---

## 🚀 Installation & Local Setup

### 1. Prerequisites
Ensure you have **Python 3.10+** and **Git** installed on your machine.

### 2. Clone and Prepare Environment
```bash
# Clone the repository
git clone https://github.com/rushabh-bm/FWC-NEXUS---AI-based-HR-module.git
cd FWC-NEXUS---AI-based-HR-module

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
# Install core and AI dependencies
pip install -r requirements.txt

# Download the spaCy English model for NER Name/Email extraction
python -m spacy download en_core_web_sm
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory:
```ini
JWT_SECRET_KEY=your_super_secure_jwt_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
# Defaults to SQLite. To switch to PostgreSQL, uncomment below:
# DATABASE_URL=postgresql://username:password@localhost:5432/hr_nexus
```

---

## 🏃 Running the Application

Start the development server with:
```bash
python run.py
```
The server will boot up at **[http://127.0.0.1:8000](http://127.0.0.1:8000)**. Since the static files are mounted at the root, opening this URL in your web browser will load the FWC Nexus dashboard automatically.

---

## 🔑 Pre-Seeded Demo Accounts

Use these accounts to test the application flows:

| Role | Username / Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@fwc.com` | `admin123` | Full access, user management, analytics. |
| **Recruiter** | `recruiter@fwc.com` | `password123` | View pipeline, evaluate profiles, chat with AI Copilot. |
| **Recruiter 2** | `recruiter2@fwc.com` | `password123` | Secondary talent acquisition account. |
| **Candidate** | `candidate@fwc.com` | `password123` | Mock candidate profile (Aryan Sharma). |

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information (if applicable).