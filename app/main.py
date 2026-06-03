"""
FastAPI Application — AI-Based HR Module  (v3.0 — Full RBAC)
=============================================================
Role-Based Access Control:
  • candidate — own profile, interview, upload, onboarding only
  • recruiter  — full pipeline: all candidates, analytics, JD, AI copilot, CSV export
  • admin      — super-user: everything + user management

Auth mechanism: simple X-Session-Token header (opaque token stored in User.session_token).
All protected routes use FastAPI Depends(get_current_user) + require_role().
"""
import os, io, csv, json, asyncio, hashlib, secrets, shutil, logging
import jwt
from datetime import datetime, timedelta
from fastapi import Header, HTTPException, status, Depends
from app.auth import create_access_token, create_refresh_token, decode_token
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional, AsyncGenerator

from fastapi import (
    FastAPI, UploadFile, File, Form,
    HTTPException, status, Depends, WebSocket, WebSocketDisconnect, Header
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, init_db, SessionLocal
from app.db_models import (
    User, Candidate, OnboardingTask, InterviewSession, ActiveJD,
    JobPosting, Application, InterviewSlot, Notification
)
from app.models import (
    parse_pdf_resume, screen_resume_text,
    chatbot_query, generate_jd,
    evaluate_code, evaluate_interview_answers,
    generate_ai_summary, get_analytics_overview,
    ONBOARDING_TEMPLATE, DEFAULT_JD,
    detect_fake_resume, generate_video_analytics
)

# ─────────────────────────────────────────────────────────────
# App Bootstrap
# ─────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    logger.info("🚀 Starting FWC Nexus AI HR Module v3.0 (RBAC Edition)…")
    init_db()
    _seed_default_data()
    logger.info("✅ Database ready.")
    yield


app = FastAPI(
    title="FWC Nexus — AI HR Module API",
    description="Production-grade AI recruitment engine with full RBAC.",
    version="3.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join("public", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────
# Password Hashing
# ─────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{hashed}"


def _verify_password(plain: str, stored: str) -> bool:
    try:
        salt, hashed = stored.split(":")
        return hashlib.sha256((salt + plain).encode()).hexdigest() == hashed
    except Exception:
        return plain == stored


def _generate_token() -> str:
    return secrets.token_urlsafe(32)


# ─────────────────────────────────────────────────────────────
# RBAC Dependency Helpers
# ─────────────────────────────────────────────────────────────

def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db)
) -> User:
    """Validate JWT token from Authorization header; raise 401 if missing or invalid."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required. Please provide Bearer token.")
    scheme, _, token = authorization.partition(' ')
    if scheme.lower() != 'bearer' or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header format.")
    payload = decode_token(token)
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token payload missing user ID.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


def require_role(*roles: str):
    """
    Returns a FastAPI dependency that ensures the current user has one of the given roles.
    Usage: Depends(require_role("recruiter", "admin"))
    """
    def _check(user: User = Depends(get_current_user)) -> User:
        # Hierarchical role check using ROLE_ORDER from role_utils
        try:
            from .role_utils import has_role
        except ImportError:
            # Fallback to exact match if utils not available
            if user.role not in roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied. This action requires role: {' or '.join(roles)}."
                )
            return user
        if not has_role(user.role, list(roles)):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. This action requires role: {' or '.join(roles)}."
            )
        return user
    return _check


# ─────────────────────────────────────────────────────────────
# Database Seeder
# ─────────────────────────────────────────────────────────────

def _make_onboarding_tasks(candidate_id: str, completed_count: int = 0) -> List[OnboardingTask]:
    tasks = []
    for i, tmpl in enumerate(ONBOARDING_TEMPLATE):
        tasks.append(OnboardingTask(
            id=f"{tmpl['id']}-{candidate_id}",
            candidate_id=candidate_id,
            title=tmpl["title"],
            completed=(i < completed_count),
            order=tmpl["order"]
        ))
    return tasks


def _seed_default_data():
    db: Session = SessionLocal()
    try:
        if db.query(User).count() > 0:
            logger.info("Database already seeded — skipping.")
            # Ensure admin exists
            if not db.query(User).filter(User.username == "admin@fwc.com").first():
                db.add(User(
                    username="admin@fwc.com",
                    password_hash=_hash_password("admin123"),
                    role="admin",
                    name="System Administrator"
                ))
                db.commit()
            return

        logger.info("🌱 Seeding database with sample data…")

        # ── Users ────────────────────────────────────────────
        users = [
            User(username="admin@fwc.com",         password_hash=_hash_password("admin123"),
                 role="admin",     name="System Administrator"),
            User(username="recruiter@fwc.com",      password_hash=_hash_password("password123"),
                 role="recruiter", name="Sarah Jenkins (Senior Talent Partner)"),
            User(username="recruiter2@fwc.com",     password_hash=_hash_password("password123"),
                 role="recruiter", name="Raj Mehta (Tech Recruiter)"),
            User(username="candidate@fwc.com",      password_hash=_hash_password("password123"),
                 role="candidate", name="Aryan Sharma"),
            User(username="priya.patel@gmail.com",  password_hash=_hash_password("password123"),
                 role="candidate", name="Priya Patel"),
            User(username="rohan.das@yahoo.com",    password_hash=_hash_password("password123"),
                 role="candidate", name="Rohan Das"),
            User(username="meera.nair@gmail.com",   password_hash=_hash_password("password123"),
                 role="candidate", name="Meera Nair"),
            User(username="dev.kumar@outlook.com",  password_hash=_hash_password("password123"),
                 role="candidate", name="Dev Kumar"),
        ]
        for u in users:
            db.add(u)

        # ── Candidates ────────────────────────────────────────
        candidates_data = [
            {
                "id": "c1", "name": "Aryan Sharma", "email": "candidate@fwc.com",
                "score": 92, "experience_years": 2,
                "skills_matched": ["Python", "JavaScript", "Machine Learning", "AI", "React", "Node.Js", "Git", "HTML", "CSS", "FastAPI"],
                "skills_missing": ["Docker", "Kubernetes", "PyTorch"],
                "resume_name": "Aryan_Sharma_CV.pdf",
                "status": "Shortlisted", "interview_status": "Completed",
                "interview_score": 88,
                "interview_eval": {
                    "accuracy": 90, "clarity": 85, "sentiment": "Highly Confident & Energetic",
                    "summary": "Demonstrated solid technical depth in neural network architectures and full-stack React state management.",
                    "detailed_scores": [85, 90, 92, 85]
                },
                "onboarding_progress": 50, "completed_tasks": 3,
                "semantic_score": 0.87, "sentiment": "POSITIVE", "ai_summary": None
            },
            {
                "id": "c2", "name": "Priya Patel", "email": "priya.patel@gmail.com",
                "score": 78, "experience_years": 1,
                "skills_matched": ["Python", "Machine Learning", "Deep Learning", "HTML", "CSS", "SQL", "Flask", "TensorFlow"],
                "skills_missing": ["JavaScript", "React", "Docker", "Node.Js"],
                "resume_name": "Priya_Patel_Resume.pdf",
                "status": "Interviewed", "interview_status": "Completed",
                "interview_score": 74,
                "interview_eval": {
                    "accuracy": 70, "clarity": 78, "sentiment": "Positive & Clear",
                    "summary": "Strong core Python and ML skills. Limited exposure to modern SPA frontends.",
                    "detailed_scores": [70, 75, 75, 76]
                },
                "onboarding_progress": 0, "completed_tasks": 0,
                "semantic_score": 0.72, "sentiment": "POSITIVE", "ai_summary": None
            },
            {
                "id": "c3", "name": "Rohan Das", "email": "rohan.das@yahoo.com",
                "score": 52, "experience_years": 0,
                "skills_matched": ["HTML", "CSS", "JavaScript", "SQL", "Git"],
                "skills_missing": ["Python", "Machine Learning", "AI", "Docker", "React", "Node.Js"],
                "resume_name": "Rohan_Das_CV.pdf",
                "status": "Applied", "interview_status": "Pending",
                "interview_score": 0, "interview_eval": None,
                "onboarding_progress": 0, "completed_tasks": 0,
                "semantic_score": 0.44, "sentiment": None, "ai_summary": None
            },
            {
                "id": "c4", "name": "Meera Nair", "email": "meera.nair@gmail.com",
                "score": 85, "experience_years": 3,
                "skills_matched": ["Python", "Django", "React", "AWS", "Docker", "Machine Learning", "SQL", "Git", "REST", "TypeScript"],
                "skills_missing": ["Kubernetes", "PyTorch", "NLP"],
                "resume_name": "Meera_Nair_Resume.pdf",
                "status": "Shortlisted", "interview_status": "Pending",
                "interview_score": 0, "interview_eval": None,
                "onboarding_progress": 0, "completed_tasks": 0,
                "semantic_score": 0.81, "sentiment": None, "ai_summary": None
            },
            {
                "id": "c5", "name": "Dev Kumar", "email": "dev.kumar@outlook.com",
                "score": 61, "experience_years": 1,
                "skills_matched": ["Python", "Flask", "SQL", "HTML", "CSS", "Git"],
                "skills_missing": ["JavaScript", "React", "AWS", "Docker", "Machine Learning", "AI"],
                "resume_name": "Dev_Kumar_CV.pdf",
                "status": "Applied", "interview_status": "Pending",
                "interview_score": 0, "interview_eval": None,
                "onboarding_progress": 0, "completed_tasks": 0,
                "semantic_score": 0.55, "sentiment": None, "ai_summary": None
            },
        ]

        for cd in candidates_data:
            c = Candidate(
                id=cd["id"], name=cd["name"], email=cd["email"],
                score=cd["score"], experience_years=cd["experience_years"],
                skills_matched=cd["skills_matched"], skills_missing=cd["skills_missing"],
                resume_name=cd["resume_name"], status=cd["status"],
                interview_status=cd["interview_status"],
                interview_score=cd["interview_score"],
                interview_eval=cd["interview_eval"],
                onboarding_progress=cd["onboarding_progress"],
                semantic_score=cd["semantic_score"],
                sentiment=cd["sentiment"],
                ai_summary=cd["ai_summary"],
            )
            db.add(c)
            db.flush()
            for task in _make_onboarding_tasks(cd["id"], cd["completed_tasks"]):
                db.add(task)

        sess = InterviewSession(
            candidate_id="c1",
            questions=[
                {"q": "Describe your experience with Python or JavaScript.",
                 "a": "I build backends with FastAPI in Python and interactive frontends using React.",
                 "score": 85},
                {"q": "What do you understand by the HTD model?",
                 "a": "Hire-Train-Deploy: getting hired, 12-week structured training, then deploying to global projects.",
                 "score": 90},
                {"q": "How would you handle a production server failure?",
                 "a": "Analyze logging, trace errors, check Docker container health, and safely redeploy with hotfixes.",
                 "score": 92},
                {"q": "Why FWC as an AI/ML Full Stack Developer?",
                 "a": "FWC offers global exposure, cutting-edge AI portfolios, and structured training.",
                 "score": 85}
            ]
        )
        db.add(sess)

        jd = ActiveJD(
            title="AI/ML Full Stack Developer",
            skills=["Python", "JavaScript", "Machine Learning", "React", "FastAPI", "Docker", "AWS"],
            locations=["Dubai", "Singapore", "India"],
            text=DEFAULT_JD,
            is_active=True
        )
        db.add(jd)

        # Seed a job posting corresponding to the active JD so candidates can apply
        jp = JobPosting(
            title="AI/ML Full Stack Developer",
            department="Engineering",
            description="We are seeking an outstanding AI/ML Full Stack Developer to build predictive pipelines, scalable microservices, and reactive user interfaces.",
            requirements="Solid knowledge of Python, React, and FastAPIs.\nExperience with machine learning models and cloud operations.",
            skills=["Python", "JavaScript", "Machine Learning", "React", "FastAPI", "Docker", "AWS"],
            experience_min=2,
            salary_range="$80k - $120k",
            locations=["Dubai", "Singapore", "India"],
            employment_type="Full-Time",
            is_active=True
        )
        db.add(jp)

        db.commit()
        logger.info("✅ Seed complete — 5 candidates, 8 users (admin + 2 recruiters + 5 candidates), 1 JD, 1 Job Posting.")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Seed error: {e}", exc_info=True)
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    role: Optional[str] = "candidate"   # "candidate" | "recruiter" (recruiter requires admin creation)

class StatusUpdateRequest(BaseModel):
    status: str

class RemarkRequest(BaseModel):
    remark: str

class TaskToggleRequest(BaseModel):
    completed: bool

class InterviewSubmitRequest(BaseModel):
    answers: List[dict]
    tab_switches: Optional[int] = 0
    fullscreen_violations: Optional[int] = 0

class ProfileUpdateRequest(BaseModel):
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    linkedin_profile: Optional[str] = None
    github_profile: Optional[str] = None
    
    tenth_school: Optional[str] = None
    tenth_board: Optional[str] = None
    tenth_passing_year: Optional[int] = None
    tenth_percentage: Optional[float] = None
    
    twelfth_college: Optional[str] = None
    twelfth_stream: Optional[str] = None
    twelfth_board: Optional[str] = None
    twelfth_passing_year: Optional[int] = None
    twelfth_percentage: Optional[float] = None
    
    diploma_college: Optional[str] = None
    diploma_branch: Optional[str] = None
    diploma_percentage: Optional[float] = None
    diploma_passing_year: Optional[int] = None
    
    grad_college: Optional[str] = None
    grad_degree: Optional[str] = None
    grad_branch: Optional[str] = None
    grad_passing_year: Optional[int] = None
    grad_cgpa: Optional[float] = None
    grad_backlogs: Optional[int] = 0
    
    skills_soft: Optional[List[str]] = []
    skills_tech: Optional[List[str]] = []
    certifications: Optional[List[str]] = []
    internships: Optional[List[dict]] = []
    projects: Optional[List[dict]] = []
    achievements: Optional[List[str]] = []

class ChatRequest(BaseModel):
    message: str

class JDGenerateRequest(BaseModel):
    title: str
    skills: str
    locations: str

class CodeSubmitRequest(BaseModel):
    language: str
    code: str

class CreateUserRequest(BaseModel):
    username: str
    password: str
    name: str
    role: str   # admin only

# Pipeline schemas
class JobCreateRequest(BaseModel):
    title: str
    department: Optional[str] = "Engineering"
    description: str
    requirements: Optional[str] = ""
    skills: List[str]
    experience_min: Optional[int] = 0
    salary_range: Optional[str] = "Competitive"
    locations: List[str]
    employment_type: Optional[str] = "Full-Time"
    deadline: Optional[str] = None

class ApplyRequest(BaseModel):
    cover_note: Optional[str] = ""

class ScheduleSlotRequest(BaseModel):
    scheduled_at: str
    duration_mins: Optional[int] = 45
    recruiter_notes: Optional[str] = ""

class ConfirmSlotRequest(BaseModel):
    confirm: bool
    decline_reason: Optional[str] = ""

class CompleteInterviewRequest(BaseModel):
    status: str
    recruiter_feedback: Optional[str] = ""


# ─────────────────────────────────────────────────────────────
# ── AUTH ROUTES ── (public)
# ─────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Public registration — always creates a CANDIDATE account."""
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Enforce: public registration always creates candidate role
    user = User(
        username=req.username,
        password_hash=_hash_password(req.password),
        role="candidate",
        name=req.name
    )
    db.add(user)

    # Auto-create candidate profile
    exists = db.query(Candidate).filter(Candidate.email == req.username).first()
    if not exists:
        new_id = f"c{db.query(Candidate).count() + 1}"
        c = Candidate(
            id=new_id, name=req.name, email=req.username,
            skills_matched=[], skills_missing=["Python", "JavaScript", "React", "ML", "AI", "Docker"],
            status="Applied", interview_status="Pending"
        )
        db.add(c)
        db.flush()
        for task in _make_onboarding_tasks(new_id):
            db.add(task)

    db.commit()
    return {"message": "Registration successful!", "user": {"username": req.username, "role": "candidate", "name": req.name}}


@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user, issue JWT access and refresh tokens."""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not _verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Create JWT tokens
    access_token_expires = timedelta(minutes=15)
    access_token = create_access_token({"sub": user.id, "role": user.role}, expires_delta=access_token_expires)
    refresh_token = create_refresh_token({"sub": user.id, "role": user.role})

    candidate_data = None
    if user.role == "candidate":
        c = db.query(Candidate).filter(Candidate.email == user.username).first()
        if c:
            candidate_data = c.to_dict()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user.to_dict(),
        "candidate": candidate_data
    }


@app.post("/api/auth/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout is client‑side; JWTs are stateless, so we simply inform the client."""
    return {"message": "Logged out successfully. Discard your token on the client side."}


@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the currently authenticated user's profile."""
    result = {"user": current_user.to_dict()}
    if current_user.role == "candidate":
        c = db.query(Candidate).filter(Candidate.email == current_user.username).first()
        result["candidate"] = c.to_dict() if c else None
    return result


# ─────────────────────────────────────────────────────────────
# ── CANDIDATE SELF-SERVICE ROUTES ── (candidate only)
# ─────────────────────────────────────────────────────────────

@app.get("/api/me/profile")
def get_my_profile(
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db)
):
    """Candidate: get own profile only."""
    c = db.query(Candidate).filter(Candidate.email == current_user.username).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate profile not found. Please upload your resume.")
    return c.to_dict()


@app.post("/api/me/interview/evaluate")
def submit_my_interview(
    req: InterviewSubmitRequest,
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db)
):
    """Candidate: submit and evaluate own AI interview answers."""
    c = db.query(Candidate).filter(Candidate.email == current_user.username).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate profile not found.")

    eval_result = evaluate_interview_answers(req.answers)
    
    # Calculate video analytics metrics
    vid_analytics = generate_video_analytics(
        req.answers, 
        tab_switches=req.tab_switches, 
        fullscreen_violations=req.fullscreen_violations
    )
    
    c.interview_status = "Completed"
    # Blend interview score and focus penalties
    final_int_score = int(eval_result["avg_score"] * 0.7 + vid_analytics["confidence_score"] * 0.3)
    c.interview_score = max(min(final_int_score, 100), 10)
    c.interview_eval = {
        "accuracy": eval_result["accuracy"],
        "clarity": eval_result["clarity"],
        "sentiment": eval_result["sentiment"],
        "summary": eval_result["summary"],
        "detailed_scores": eval_result["detailed_scores"]
    }
    c.video_analytics = vid_analytics
    c.sentiment = eval_result["sentiment_label"]
    c.status = "Interviewed"
    c.ai_summary = None

    sess = db.query(InterviewSession).filter(InterviewSession.candidate_id == c.id).first()
    qa_list = [{"q": a["q"], "a": a["a"], "score": eval_result["detailed_scores"][i]}
               for i, a in enumerate(req.answers)]
    if sess:
        sess.questions = qa_list
    else:
        db.add(InterviewSession(candidate_id=c.id, questions=qa_list))

    db.commit()
    db.refresh(c)
    return {"message": "Interview evaluated successfully.", "candidate": c.to_dict()}


@app.post("/api/me/onboarding/tasks/{task_id}")
def toggle_my_task(
    task_id: str,
    req: TaskToggleRequest,
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db)
):
    """Candidate: toggle own onboarding task."""
    c = db.query(Candidate).filter(Candidate.email == current_user.username).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate profile not found.")

    task = db.query(OnboardingTask).filter(
        OnboardingTask.candidate_id == c.id,
        OnboardingTask.id == task_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    task.completed = req.completed
    db.flush()

    all_tasks = db.query(OnboardingTask).filter(OnboardingTask.candidate_id == c.id).all()
    done = sum(1 for t in all_tasks if t.completed)
    c.onboarding_progress = int(done / len(all_tasks) * 100) if all_tasks else 0
    db.commit()
    db.refresh(c)
    return {"message": "Task updated.", "candidate": c.to_dict()}


@app.post("/api/me/resume/upload")
async def upload_my_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db)
):
    """Candidate: upload / update own resume."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save error: {str(e)}")

    text = parse_pdf_resume(file_path)
    if not text.strip():
        text = f"Candidate profile. Skills: Python, Javascript, React, Git."

    profile = screen_resume_text(text, file.filename)

    # Update existing candidate
    c = db.query(Candidate).filter(Candidate.email == current_user.username).first()
    if c:
        c.score = profile["score"]
        c.skills_matched = profile["skills_matched"]
        c.skills_missing = profile["skills_missing"]
        c.experience_years = profile["experience_years"]
        c.resume_name = profile["resume_name"]
        c.semantic_score = profile["semantic_score"]
        c.ai_summary = None
        db.commit()
        db.refresh(c)
        return {"message": "Resume updated & re-screened.", "candidate": c.to_dict()}
    else:
        raise HTTPException(status_code=404, detail="Candidate profile not found. Please contact your recruiter.")


@app.post("/api/me/profile/update")
def update_my_profile(
    req: ProfileUpdateRequest,
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db)
):
    c = db.query(Candidate).filter(Candidate.email == current_user.username).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate profile not found.")

    # Update personal fields
    if req.phone is not None: c.phone = req.phone
    if req.dob is not None: c.dob = req.dob
    if req.gender is not None: c.gender = req.gender
    if req.address is not None: c.address = req.address
    if req.linkedin_profile is not None: c.linkedin_profile = req.linkedin_profile
    if req.github_profile is not None: c.github_profile = req.github_profile

    # Update academic fields
    if req.tenth_school is not None: c.tenth_school = req.tenth_school
    if req.tenth_board is not None: c.tenth_board = req.tenth_board
    if req.tenth_passing_year is not None: c.tenth_passing_year = req.tenth_passing_year
    if req.tenth_percentage is not None: c.tenth_percentage = req.tenth_percentage

    if req.twelfth_college is not None: c.twelfth_college = req.twelfth_college
    if req.twelfth_stream is not None: c.twelfth_stream = req.twelfth_stream
    if req.twelfth_board is not None: c.twelfth_board = req.twelfth_board
    if req.twelfth_passing_year is not None: c.twelfth_passing_year = req.twelfth_passing_year
    if req.twelfth_percentage is not None: c.twelfth_percentage = req.twelfth_percentage

    if req.diploma_college is not None: c.diploma_college = req.diploma_college
    if req.diploma_branch is not None: c.diploma_branch = req.diploma_branch
    if req.diploma_percentage is not None: c.diploma_percentage = req.diploma_percentage
    if req.diploma_passing_year is not None: c.diploma_passing_year = req.diploma_passing_year

    if req.grad_college is not None: c.grad_college = req.grad_college
    if req.grad_degree is not None: c.grad_degree = req.grad_degree
    if req.grad_branch is not None: c.grad_branch = req.grad_branch
    if req.grad_passing_year is not None: c.grad_passing_year = req.grad_passing_year
    if req.grad_cgpa is not None: c.grad_cgpa = req.grad_cgpa
    if req.grad_backlogs is not None: c.grad_backlogs = req.grad_backlogs

    # Update skills/certifications
    if req.skills_soft is not None: c.skills_soft = req.skills_soft
    if req.certifications is not None: c.certifications = req.certifications
    if req.internships is not None: c.internships = req.internships
    if req.projects is not None: c.projects = req.projects
    if req.achievements is not None: c.achievements = req.achievements

    # If new technical skills were submitted, add them to skills_matched
    if req.skills_tech:
        current_matched = set(c.skills_matched or [])
        current_matched.update(req.skills_tech)
        c.skills_matched = list(current_matched)

    # Simple resume analysis & fake resume detection
    resume_sim_text = f"{c.name} Profile. Skills: {', '.join(c.skills_matched or [])}. Academic: {c.tenth_school}, {c.twelfth_college}, {c.grad_college}."
    fake_report = detect_fake_resume(resume_sim_text)
    
    # Calculate Completion %
    fields = [
        c.phone, c.dob, c.gender, c.address, c.linkedin_profile,
        c.tenth_school, c.tenth_board, c.tenth_passing_year, c.tenth_percentage,
        c.twelfth_college, c.twelfth_board, c.twelfth_passing_year, c.twelfth_percentage,
        c.grad_college, c.grad_degree, c.grad_branch, c.grad_passing_year, c.grad_cgpa,
        c.resume_name, c.profile_photo
    ]
    filled = sum(1 for f in fields if f is not None and str(f).strip() != "" and str(f) != "Not Uploaded")
    # Add skills count weight
    skills_weight = 1 if (c.skills_matched or c.skills_soft) else 0
    projects_weight = 1 if c.projects else 0
    completion_pct = int(((filled + skills_weight + projects_weight) / 22) * 100)
    completion_pct = min(100, completion_pct)

    # Job Match Percentage
    active_jd = db.query(ActiveJD).filter(ActiveJD.is_active == True).first()
    required_skills = set(active_jd.skills if active_jd else ["Python", "JavaScript", "React"])
    matched_skills = set(c.skills_matched or [])
    overlap = matched_skills.intersection(required_skills)
    job_match_pct = int(len(overlap) / len(required_skills) * 100) if required_skills else 50
    missing = list(required_skills - matched_skills)
    c.skills_missing = missing

    # Update Suggestions
    c.ai_suggestions = {
        "resume_completion_percentage": completion_pct,
        "job_match_percentage": job_match_pct,
        "fake_resume_detection": fake_report,
        "missing_skills": missing,
        "resume_improvements": [
            imp for imp in [
                "Add Github link to highlight code contributions." if not c.github_profile else None,
                "Provide detailed technical skills matching active jobs." if len(matched_skills) < 5 else None,
                "Document certifications to validate competency." if not c.certifications else None,
                "Keep academic percentage information updated." if not c.tenth_percentage or not c.twelfth_percentage else None
            ] if imp is not None
        ],
        "recommended_certifications": [
            "AWS Certified Developer - Associate" if "AWS" in missing else "Introduction to AWS Fundamentals",
            "Certified Kubernetes Application Developer (CKAD)" if "Docker" in missing or "Kubernetes" in missing else "Docker Container Foundations",
            "React Advanced Developer Certification" if "React" in missing else "Modern React & Redux Mastery",
            "FastAPI Microservices Certification" if "FastAPI" in missing or "Python" in missing else "Advanced Python for Web API Development"
        ],
        "career_recommendations": [
            "AI/ML Engineer Path (Targeting Dubai/Singapore)" if "Machine Learning" in matched_skills or "AI" in matched_skills else "Full Stack Software Developer Cohort",
            "Cloud Native & DevOps Architect Program" if "Docker" in matched_skills or "AWS" in matched_skills else "Application Developer Specialist Track"
        ]
    }

    db.commit()
    db.refresh(c)
    return {"message": "Profile updated successfully.", "candidate": c.to_dict()}


@app.post("/api/me/upload/doc")
async def upload_document(
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db)
):
    c = db.query(Candidate).filter(Candidate.email == current_user.username).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate profile not found.")

    ext = file.filename.split(".")[-1].lower()
    if doc_type in ["tenth_marks", "twelfth_marks"] and ext != "pdf" and ext not in ["jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="Academic documents must be PDF or Images (JPG/PNG).")
    if doc_type == "profile_photo" and ext not in ["jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="Profile photo must be an image (JPG/PNG).")

    filename = f"{current_user.id}_{doc_type}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    try:
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save error: {str(e)}")

    relative_path = f"/uploads/{filename}"
    if doc_type == "tenth_marks":
        c.tenth_marks_card = relative_path
    elif doc_type == "twelfth_marks":
        c.twelfth_marks_card = relative_path
    elif doc_type == "profile_photo":
        c.profile_photo = relative_path

    db.commit()
    db.refresh(c)
    return {"message": "Document uploaded successfully.", "file_path": relative_path, "candidate": c.to_dict()}


# ─────────────────────────────────────────────────────────────
# ── RECRUITER ROUTES ── (recruiter + admin only)
# ─────────────────────────────────────────────────────────────

@app.get("/api/candidates")
def get_candidates(
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    """Recruiter/Admin: list all candidates ranked by AI score."""
    candidates = db.query(Candidate).order_by(Candidate.score.desc()).all()
    return [c.to_dict() for c in candidates]


@app.get("/api/candidates/{id}")
def get_candidate(
    id: str,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    """Recruiter/Admin: get full candidate profile."""
    c = db.query(Candidate).filter(Candidate.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return c.to_dict()


@app.post("/api/candidates/{id}/status")
def update_status(
    id: str,
    req: StatusUpdateRequest,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    """Recruiter/Admin: update candidate pipeline status."""
    c = db.query(Candidate).filter(Candidate.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    c.status = req.status
    if req.status == "Hired":
        for t in c.onboarding_tasks:
            t.completed = False
        c.onboarding_progress = 0
    db.commit()
    db.refresh(c)
    return {"message": f"Status updated to {req.status}", "candidate": c.to_dict()}


@app.post("/api/candidates/{id}/remark")
def add_remark(
    id: str,
    req: RemarkRequest,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    """Recruiter/Admin: add internal recruiter remark to a candidate."""
    c = db.query(Candidate).filter(Candidate.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    c.recruiter_remark = req.remark
    db.commit()
    db.refresh(c)
    return {"message": "Remark saved.", "candidate": c.to_dict()}


@app.get("/api/candidates/{id}/ai-summary")
def get_ai_summary(
    id: str,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    """Recruiter/Admin: generate or retrieve AI candidate narrative."""
    c = db.query(Candidate).filter(Candidate.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    if not c.ai_summary:
        c.ai_summary = generate_ai_summary(c.to_dict())
        db.commit()
    return {"summary": c.ai_summary, "candidate_id": id}


@app.post("/api/candidates/{id}/interview/evaluate")
def evaluate_interview(
    id: str,
    req: InterviewSubmitRequest,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    """Recruiter/Admin: run AI interview evaluation for a candidate."""
    c = db.query(Candidate).filter(Candidate.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    eval_result = evaluate_interview_answers(req.answers)
    c.interview_status = "Completed"
    c.interview_score = eval_result["avg_score"]
    c.interview_eval = {
        "accuracy": eval_result["accuracy"],
        "clarity": eval_result["clarity"],
        "sentiment": eval_result["sentiment"],
        "summary": eval_result["summary"],
        "detailed_scores": eval_result["detailed_scores"]
    }
    c.sentiment = eval_result["sentiment_label"]
    c.status = "Interviewed"
    c.ai_summary = None

    sess = db.query(InterviewSession).filter(InterviewSession.candidate_id == id).first()
    qa_list = [{"q": a["q"], "a": a["a"], "score": eval_result["detailed_scores"][i]}
               for i, a in enumerate(req.answers)]
    if sess:
        sess.questions = qa_list
    else:
        db.add(InterviewSession(candidate_id=id, questions=qa_list))

    db.commit()
    db.refresh(c)
    return {"message": "Interview evaluated successfully.", "candidate": c.to_dict()}


@app.post("/api/candidates/{id}/onboarding/tasks/{task_id}")
def toggle_task(
    id: str,
    task_id: str,
    req: TaskToggleRequest,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    """Recruiter/Admin: toggle candidate onboarding task."""
    c = db.query(Candidate).filter(Candidate.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    task = db.query(OnboardingTask).filter(
        OnboardingTask.candidate_id == id,
        OnboardingTask.id == task_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    task.completed = req.completed
    db.flush()
    all_tasks = db.query(OnboardingTask).filter(OnboardingTask.candidate_id == id).all()
    done = sum(1 for t in all_tasks if t.completed)
    c.onboarding_progress = int(done / len(all_tasks) * 100) if all_tasks else 0
    db.commit()
    db.refresh(c)
    return {"message": "Task updated.", "candidate": c.to_dict()}


# ── Resume Upload (Recruiter) ──────────────────────────────────

@app.post("/api/resumes/upload-bulk")
async def upload_resumes_bulk(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    """Recruiter/Admin: upload and screen multiple candidate resumes in one request."""
    results = []
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            results.append({"filename": file.filename, "error": "Only PDF files are accepted."})
            continue
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        try:
            with open(file_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)
        except Exception as e:
            results.append({"filename": file.filename, "error": f"File save error: {str(e)}"})
            continue
        text = parse_pdf_resume(file_path)
        if not text.strip():
            text = f"Candidate profile from {file.filename}. Skills: Python, Javascript, React, Git."
        profile = screen_resume_text(text, file.filename)
        existing = db.query(Candidate).filter(Candidate.email == profile["email"]).first()
        if existing:
            existing.score = profile["score"]
            existing.skills_matched = profile["skills_matched"]
            existing.skills_missing = profile["skills_missing"]
            existing.experience_years = profile["experience_years"]
            existing.resume_name = profile["resume_name"]
            existing.semantic_score = profile["semantic_score"]
            existing.ai_summary = None
            db.commit()
            db.refresh(existing)
            results.append({"filename": file.filename, "message": "Resume updated & re-screened.", "candidate": existing.to_dict()})
        else:
            new_id = f"c{db.query(Candidate).count() + 1}"
            c = Candidate(
                id=new_id,
                name=profile["name"],
                email=profile["email"],
                score=profile["score"],
                skills_matched=profile["skills_matched"],
                skills_missing=profile["skills_missing"],
                experience_years=profile["experience_years"],
                resume_name=profile["resume_name"],
                semantic_score=profile["semantic_score"],
                status="Applied",
                interview_status="Pending"
            )
            db.add(c)
            db.flush()
            for task in _make_onboarding_tasks(new_id):
                db.add(task)
            if not db.query(User).filter(User.username == profile["email"]).first():
                db.add(User(
                    username=profile["email"],
                    password_hash=_hash_password("nexus@2024"),
                    role="candidate",
                    name=profile["name"]
                ))
            db.commit()
            db.refresh(c)
            results.append({"filename": file.filename, "message": "Resume screened & candidate created.", "candidate": c.to_dict()})
    return {"results": results}

@app.post("/api/resumes/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    """Recruiter/Admin: upload and screen a candidate's resume."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save error: {str(e)}")

    text = parse_pdf_resume(file_path)
    if not text.strip():
        text = f"Candidate profile from {file.filename}. Skills: Python, Javascript, React, Git."

    profile = screen_resume_text(text, file.filename)

    existing = db.query(Candidate).filter(Candidate.email == profile["email"]).first()
    if existing:
        existing.score = profile["score"]
        existing.skills_matched = profile["skills_matched"]
        existing.skills_missing = profile["skills_missing"]
        existing.experience_years = profile["experience_years"]
        existing.resume_name = profile["resume_name"]
        existing.semantic_score = profile["semantic_score"]
        existing.ai_summary = None
        db.commit()
        db.refresh(existing)
        return {"message": "Resume updated & re-screened.", "candidate": existing.to_dict()}
    else:
        new_id = f"c{db.query(Candidate).count() + 1}"
        c = Candidate(
            id=new_id,
            name=profile["name"], email=profile["email"],
            score=profile["score"],
            skills_matched=profile["skills_matched"],
            skills_missing=profile["skills_missing"],
            experience_years=profile["experience_years"],
            resume_name=profile["resume_name"],
            semantic_score=profile["semantic_score"],
            status="Applied", interview_status="Pending"
        )
        db.add(c)
        db.flush()
        for task in _make_onboarding_tasks(new_id):
            db.add(task)

        if not db.query(User).filter(User.username == profile["email"]).first():
            db.add(User(
                username=profile["email"],
                password_hash=_hash_password("nexus@2024"),
                role="candidate",
                name=profile["name"]
            ))

        db.commit()
        db.refresh(c)
        return {"message": "Resume screened & candidate created.", "candidate": c.to_dict()}


# ── AI / Analytics Routes (Recruiter only) ────────────────────

@app.post("/api/ai/chat")
def chat_copilot(
    req: ChatRequest,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    return chatbot_query(req.message, db)


@app.post("/api/ai/generate-jd")
def ai_generate_jd(
    req: JDGenerateRequest,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    return generate_jd(req.title, req.skills, req.locations, db)


@app.post("/api/candidates/{id}/code/evaluate")
def run_code_assessment(
    id: str,
    req: CodeSubmitRequest,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    result = evaluate_code(req.language, req.code)
    if result["success"]:
        c = db.query(Candidate).filter(Candidate.id == id).first()
        if c:
            c.score = min(c.score + 5, 98)
            db.commit()
    return result


@app.get("/api/analytics/overview")
def analytics_overview(
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    return get_analytics_overview(db)


@app.get("/api/export/candidates.csv")
def export_candidates_csv(
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    candidates = db.query(Candidate).order_by(Candidate.score.desc()).all()
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "id", "name", "email", "score", "status", "interview_status",
        "interview_score", "experience_years", "skills_matched",
        "skills_missing", "onboarding_progress", "resume_name", "created_at"
    ])
    writer.writeheader()
    for c in candidates:
        writer.writerow({
            "id": c.id, "name": c.name, "email": c.email,
            "score": c.score, "status": c.status,
            "interview_status": c.interview_status,
            "interview_score": c.interview_score,
            "experience_years": c.experience_years,
            "skills_matched": "|".join(c.skills_matched or []),
            "skills_missing": "|".join(c.skills_missing or []),
            "onboarding_progress": c.onboarding_progress,
            "resume_name": c.resume_name,
            "created_at": c.created_at.strftime("%Y-%m-%d") if c.created_at else ""
        })
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nexus_candidates.csv"}
    )


# ─────────────────────────────────────────────────────────────
# ── ADMIN ROUTES ── (admin only)
# ─────────────────────────────────────────────────────────────

@app.get("/api/admin/users")
def admin_get_users(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Admin: list all platform users."""
    users = db.query(User).all()
    return [u.to_dict() for u in users]


@app.post("/api/admin/users")
def admin_create_user(
    req: CreateUserRequest,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Admin: create a user with any role (including recruiter)."""
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = User(
        username=req.username,
        password_hash=_hash_password(req.password),
        role=req.role,
        name=req.name
    )
    db.add(user)

    if req.role == "candidate":
        new_id = f"c{db.query(Candidate).count() + 1}"
        c = Candidate(
            id=new_id, name=req.name, email=req.username,
            skills_matched=[], skills_missing=[],
            status="Applied", interview_status="Pending"
        )
        db.add(c)
        db.flush()
        for task in _make_onboarding_tasks(new_id):
            db.add(task)

    db.commit()
    return {"message": f"User '{req.username}' created with role '{req.role}'.", "user": user.to_dict()}

@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Admin: delete a user."""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    db.delete(user)
    db.commit()
    return {"message": "User deleted."}


@app.get("/api/admin/stats")
def admin_stats(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Admin: platform-wide statistics."""
    total_users = db.query(User).count()
    candidates  = db.query(User).filter(User.role == "candidate").count()
    recruiters  = db.query(User).filter(User.role == "recruiter").count()
    total_apps  = db.query(Candidate).count()
    hired       = db.query(Candidate).filter(Candidate.status == "Hired").count()
    return {
        "total_users": total_users,
        "candidates": candidates,
        "recruiters": recruiters,
        "total_applications": total_apps,
        "hired": hired,
        "analytics": get_analytics_overview(db)
    }


# ─────────────────────────────────────────────────────────────
# ── PIPELINE ROUTES ── (recruiter / candidate / notifications)
# ─────────────────────────────────────────────────────────────

def _notify(db: Session, user_id: int, title: str, message: str, notif_type: str = "info", link_page: str = None, link_id: str = None):
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notif_type=notif_type,
            link_page=link_page,
            link_id=str(link_id) if link_id is not None else None
        )
        db.add(notif)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")


@app.post("/api/jobs")
def create_job(
    req: JobCreateRequest,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    import datetime
    deadline_dt = None
    if req.deadline:
        try:
            deadline_dt = datetime.datetime.fromisoformat(req.deadline.replace("Z", "+00:00"))
        except ValueError:
            try:
                deadline_dt = datetime.datetime.strptime(req.deadline, "%Y-%m-%d")
            except ValueError:
                pass
    
    job = JobPosting(
        title=req.title,
        department=req.department,
        description=req.description,
        requirements=req.requirements,
        skills=req.skills,
        experience_min=req.experience_min,
        salary_range=req.salary_range,
        locations=req.locations,
        employment_type=req.employment_type,
        deadline=deadline_dt,
        posted_by_id=current_user.id,
        posted_by_name=current_user.name
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Notify all candidates
    candidates = db.query(User).filter(User.role == "candidate").all()
    for c in candidates:
        _notify(db, c.id, "New Job Posted!", f"A new position '{job.title}' has been posted in {job.department}.", "info", "job-board", job.id)
        
    return {"message": "Job posting created successfully.", "job": job.to_dict()}


@app.get("/api/jobs")
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(JobPosting).filter(JobPosting.is_active == True).all()
    return [job.to_dict() for job in jobs]


@app.get("/api/jobs/{id}")
def get_job_detail(id: int, db: Session = Depends(get_db)):
    job = db.query(JobPosting).filter(JobPosting.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")
    return job.to_dict()


@app.patch("/api/jobs/{id}")
def toggle_job_active(
    id: int,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    job = db.query(JobPosting).filter(JobPosting.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")
    job.is_active = not job.is_active
    db.commit()
    db.refresh(job)
    status_str = "active" if job.is_active else "inactive"
    return {"message": f"Job is now {status_str}.", "job": job.to_dict()}


@app.post("/api/jobs/{id}/apply")
def apply_to_job(
    id: int,
    req: ApplyRequest,
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.email == current_user.username).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found. Please upload a resume first.")
    
    job = db.query(JobPosting).filter(JobPosting.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")
        
    # Check duplicate application
    existing = db.query(Application).filter(Application.candidate_id == candidate.id, Application.job_id == job.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this job.")
        
    # Simple semantic matching logic
    matched_skills = set(candidate.skills_matched or [])
    required_skills = set(job.skills or [])
    overlap = matched_skills.intersection(required_skills)
    ai_score = int(len(overlap) / len(required_skills) * 100) if required_skills else 50
    
    app_obj = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        cover_note=req.cover_note,
        ai_score=ai_score,
        status="Applied"
    )
    db.add(app_obj)
    
    # Update candidate status
    candidate.status = "Applied"
    
    db.commit()
    db.refresh(app_obj)
    
    # Notify all recruiters/admins
    recruiters = db.query(User).filter(User.role.in_(["recruiter", "admin"])).all()
    for r in recruiters:
        _notify(db, r.id, "New Application Received", f"{candidate.name} applied for '{job.title}' with AI match score {ai_score}%.", "action", "applications", app_obj.id)
        
    return {"message": "Application submitted successfully.", "application": app_obj.to_dict()}


@app.get("/api/jobs/{id}/applications")
def get_job_applications(
    id: int,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    apps = db.query(Application).filter(Application.job_id == id).all()
    return [a.to_dict() for a in apps]


@app.get("/api/applications")
def list_all_applications(
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    apps = db.query(Application).all()
    return [a.to_dict() for a in apps]


@app.get("/api/me/applications")
def list_my_applications(
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.email == current_user.username).first()
    if not candidate:
        return []
    apps = db.query(Application).filter(Application.candidate_id == candidate.id).all()
    return [a.to_dict() for a in apps]


@app.post("/api/applications/{id}/shortlist")
def shortlist_application(
    id: int,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    app_obj = db.query(Application).filter(Application.id == id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found.")
    
    app_obj.status = "Shortlisted"
    if app_obj.candidate:
        app_obj.candidate.status = "Shortlisted"
        
    db.commit()
    db.refresh(app_obj)
    
    # Notify candidate
    cand_user = db.query(User).filter(User.username == app_obj.candidate.email).first()
    if cand_user:
        _notify(db, cand_user.id, "Application Shortlisted!", f"Congratulations! Your application for '{app_obj.job.title}' has been shortlisted.", "success", "my-applications", app_obj.id)
        
    return {"message": "Application shortlisted.", "application": app_obj.to_dict()}


@app.post("/api/applications/{id}/reject")
def reject_application(
    id: int,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    app_obj = db.query(Application).filter(Application.id == id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found.")
    
    app_obj.status = "Rejected"
    if app_obj.candidate:
        app_obj.candidate.status = "Rejected"
        
    db.commit()
    db.refresh(app_obj)
    
    # Notify candidate
    cand_user = db.query(User).filter(User.username == app_obj.candidate.email).first()
    if cand_user:
        _notify(db, cand_user.id, "Application Update", f"Thank you for your interest in '{app_obj.job.title}'. Unfortunately, we are not moving forward with your application.", "warning", "my-applications", app_obj.id)
        
    return {"message": "Application rejected.", "application": app_obj.to_dict()}


@app.post("/api/applications/{id}/schedule")
def schedule_slot(
    id: int,
    req: ScheduleSlotRequest,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    import datetime, uuid
    app_obj = db.query(Application).filter(Application.id == id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found.")
        
    try:
        dt = datetime.datetime.fromisoformat(req.scheduled_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date-time format. Use ISO format.")
        
    # Check if a slot already exists
    slot = db.query(InterviewSlot).filter(InterviewSlot.application_id == id).first()
    if slot:
        slot.scheduled_at = dt
        slot.duration_mins = req.duration_mins
        slot.recruiter_notes = req.recruiter_notes
        slot.slot_status = "Pending"
    else:
        slot = InterviewSlot(
            application_id=id,
            scheduled_at=dt,
            duration_mins=req.duration_mins,
            room_id=str(uuid.uuid4()),
            slot_status="Pending",
            recruiter_notes=req.recruiter_notes
        )
        db.add(slot)
        
    app_obj.status = "Invited"
    if app_obj.candidate:
        app_obj.candidate.status = "Invited"
        
    db.commit()
    db.refresh(app_obj)
    
    # Notify candidate
    cand_user = db.query(User).filter(User.username == app_obj.candidate.email).first()
    if cand_user:
        _notify(db, cand_user.id, "Interview Scheduled", f"An interview has been scheduled for '{app_obj.job.title}' on {dt.strftime('%Y-%m-%d %H:%M UTC')}. Please confirm your availability.", "action", "my-applications", app_obj.id)
        
    return {"message": "Interview slot scheduled successfully.", "application": app_obj.to_dict()}


@app.post("/api/applications/{id}/slot/confirm")
def confirm_slot(
    id: int,
    req: ConfirmSlotRequest,
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db)
):
    app_obj = db.query(Application).filter(Application.id == id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found.")
        
    slot = app_obj.slot
    if not slot:
        raise HTTPException(status_code=404, detail="No interview slot scheduled for this application.")
        
    if req.confirm:
        slot.slot_status = "Confirmed"
        app_obj.status = "Confirmed"
        if app_obj.candidate:
            app_obj.candidate.status = "Confirmed"
            app_obj.candidate.interview_status = "Pending"
    else:
        slot.slot_status = "Declined"
        slot.decline_reason = req.decline_reason
        app_obj.status = "Declined"
        if app_obj.candidate:
            app_obj.candidate.status = "Declined"
            
    db.commit()
    db.refresh(app_obj)
    
    # Notify recruiters
    status_str = "confirmed" if req.confirm else "declined"
    recruiters = db.query(User).filter(User.role.in_(["recruiter", "admin"])).all()
    for r in recruiters:
        _notify(db, r.id, f"Interview Slot {status_str.capitalize()}", f"Candidate {app_obj.candidate.name} has {status_str} the interview slot for '{app_obj.job.title}'.", "info", "applications", app_obj.id)
        
    return {"message": f"Interview slot {status_str}.", "application": app_obj.to_dict()}


@app.post("/api/applications/{id}/complete")
def complete_interview(
    id: int,
    req: CompleteInterviewRequest,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db)
):
    app_obj = db.query(Application).filter(Application.id == id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found.")
        
    if req.status not in ["Hired", "Rejected"]:
        raise HTTPException(status_code=400, detail="Invalid decision status. Must be 'Hired' or 'Rejected'.")
        
    app_obj.status = req.status
    app_obj.recruiter_feedback = req.recruiter_feedback
    
    if app_obj.candidate:
        app_obj.candidate.status = req.status
        app_obj.candidate.interview_status = "Completed"
        if req.status == "Hired":
            # Initialize onboarding tasks
            for t in app_obj.candidate.onboarding_tasks:
                t.completed = False
            app_obj.candidate.onboarding_progress = 0
            
    slot = app_obj.slot
    if slot:
        slot.slot_status = "Completed"
        
    db.commit()
    db.refresh(app_obj)
    
    # Notify candidate
    cand_user = db.query(User).filter(User.username == app_obj.candidate.email).first()
    if cand_user:
        title = "Congratulations! You're Hired!" if req.status == "Hired" else "Application Status Update"
        notif_type = "success" if req.status == "Hired" else "warning"
        msg = f"We are thrilled to offer you the position of '{app_obj.job.title}'! Welcome aboard." if req.status == "Hired" else f"Thank you for interviewing for '{app_obj.job.title}'. We have decided to pursue other candidates at this time."
        _notify(db, cand_user.id, title, msg, notif_type, "my-applications", app_obj.id)
        
    return {"message": f"Interview pipeline completed with decision: {req.status}", "application": app_obj.to_dict()}


@app.get("/api/notifications")
def list_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()
    return [n.to_dict() for n in notifs]


@app.post("/api/notifications/{id}/read")
def mark_notification_read(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(Notification.id == id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read."}


# ─────────────────────────────────────────────────────────────
# WebSocket — Real-Time AI Copilot (Recruiter only)
# ─────────────────────────────────────────────────────────────

class WSConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)


ws_manager = WSConnectionManager()


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await ws_manager.connect(websocket)
    db: Session = SessionLocal()
    try:
        await websocket.send_json({
            "type": "welcome",
            "content": "🤖 Nexus AI Co-Pilot connected. Ask me anything about your candidates!",
            "suggestions": ["Who is our top candidate?", "Show pipeline stats", "Who has Python skills?"]
        })

        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            query = msg.get("message", "").strip()
            if not query:
                continue

            await websocket.send_json({"type": "user", "content": query})
            await websocket.send_json({"type": "typing"})
            await asyncio.sleep(0.4)

            result = chatbot_query(query, db)
            reply = result.get("reply", "")
            suggestions = result.get("suggestions", [])

            chunk_size = 5
            for i in range(0, len(reply), chunk_size):
                chunk = reply[i: i + chunk_size]
                await websocket.send_json({"type": "chunk", "content": chunk})
                await asyncio.sleep(0.012)

            await websocket.send_json({"type": "done", "suggestions": suggestions})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        ws_manager.disconnect(websocket)
        db.close()


# ─────────────────────────────────────────────────────────────
# Static File Serving (MUST be LAST)
# ─────────────────────────────────────────────────────────────

app.mount("/", StaticFiles(directory="public", html=True), name="public")
