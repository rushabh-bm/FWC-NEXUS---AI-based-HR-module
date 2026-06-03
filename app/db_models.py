"""
SQLAlchemy ORM Models (Database Tables).
All tables are created automatically on first run via init_db().

Recruitment Lifecycle:
  JobPosting  → Application → InterviewSlot → Decision → Notification
"""
from datetime import datetime, timezone

def _now():
    """Return current UTC time (timezone-aware)."""
    return datetime.now(timezone.utc)

from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base


# ─────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id             = Column(Integer, primary_key=True, index=True)
    username       = Column(String(255), unique=True, index=True, nullable=False)
    password_hash  = Column(String(255), nullable=False)
    role           = Column(String(50), default="candidate")   # admin | recruiter | candidate
    name           = Column(String(255), nullable=False)
    session_token  = Column(String(100), nullable=True, unique=True, index=True)
    created_at     = Column(DateTime, default=_now)

    # Relationships
    notifications  = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id":         self.id,
            "username":   self.username,
            "role":       self.role,
            "name":       self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ─────────────────────────────────────────────────────────────
class JobPosting(Base):
    """A job opening created by a recruiter."""
    __tablename__ = "job_postings"

    id              = Column(Integer,    primary_key=True, autoincrement=True)
    title           = Column(String(255), nullable=False)
    department      = Column(String(100), default="Engineering")
    description     = Column(Text,        nullable=False)
    requirements    = Column(Text,        nullable=True)        # bullet points
    skills          = Column(JSON,        default=list)         # required skills list
    experience_min  = Column(Integer,     default=0)            # min years experience
    salary_range    = Column(String(100), default="Competitive")
    locations       = Column(JSON,        default=list)
    employment_type = Column(String(50),  default="Full-Time")  # Full-Time|Contract|Internship
    deadline        = Column(DateTime,    nullable=True)        # application deadline
    posted_by_id    = Column(Integer,     ForeignKey("users.id"), nullable=True)
    posted_by_name  = Column(String(255), default="FWC Talent Team")
    is_active       = Column(Boolean,     default=True)
    created_at      = Column(DateTime,    default=_now)

    # Relationships
    applications    = relationship("Application", back_populates="job", cascade="all, delete-orphan")

    def to_dict(self, application_count: int = None):
        data = {
            "id":              self.id,
            "title":           self.title,
            "department":      self.department,
            "description":     self.description,
            "requirements":    self.requirements,
            "skills":          self.skills or [],
            "experience_min":  self.experience_min,
            "salary_range":    self.salary_range,
            "locations":       self.locations or [],
            "employment_type": self.employment_type,
            "deadline":        self.deadline.isoformat() if self.deadline else None,
            "posted_by_name":  self.posted_by_name,
            "is_active":       self.is_active,
            "created_at":      self.created_at.isoformat() if self.created_at else None,
        }
        if application_count is not None:
            data["application_count"] = application_count
        return data


# ─────────────────────────────────────────────────────────────
class Application(Base):
    """A candidate's application to a specific job posting."""
    __tablename__ = "applications"

    id              = Column(Integer,    primary_key=True, autoincrement=True)
    candidate_id    = Column(String(20), ForeignKey("candidates.id", ondelete="CASCADE"))
    job_id          = Column(Integer,    ForeignKey("job_postings.id", ondelete="CASCADE"))
    cover_note      = Column(Text,       nullable=True)
    ai_score        = Column(Integer,    default=0)     # AI match score 0–100
    status          = Column(String(50), default="Applied")
    # Applied → Shortlisted → Invited → Confirmed → Interviewed → Hired | Rejected
    recruiter_feedback = Column(Text,   nullable=True)  # shown to candidate on decision
    applied_at      = Column(DateTime,  default=_now)
    updated_at      = Column(DateTime,  default=_now,   onupdate=_now)

    # Relationships
    candidate       = relationship("Candidate", back_populates="applications")
    job             = relationship("JobPosting", back_populates="applications")
    slot            = relationship("InterviewSlot", back_populates="application",
                                   uselist=False, cascade="all, delete-orphan")

    def to_dict(self, include_candidate: bool = True, include_job: bool = True):
        data = {
            "id":                  self.id,
            "candidate_id":        self.candidate_id,
            "job_id":              self.job_id,
            "cover_note":          self.cover_note,
            "ai_score":            self.ai_score,
            "status":              self.status,
            "recruiter_feedback":  self.recruiter_feedback,
            "applied_at":          self.applied_at.isoformat() if self.applied_at else None,
            "updated_at":          self.updated_at.isoformat() if self.updated_at else None,
            "slot":                self.slot.to_dict() if self.slot else None,
        }
        if include_candidate and self.candidate:
            data["candidate"] = {
                "id":               self.candidate.id,
                "name":             self.candidate.name,
                "email":            self.candidate.email,
                "score":            self.candidate.score,
                "experience_years": self.candidate.experience_years,
                "resume_name":      self.candidate.resume_name,
                "skills_matched":   self.candidate.skills_matched or [],
                "interview_status": self.candidate.interview_status,
            }
        if include_job and self.job:
            data["job"] = {
                "id":    self.job.id,
                "title": self.job.title,
                "department": self.job.department,
                "skills": self.job.skills or [],
            }
        return data


# ─────────────────────────────────────────────────────────────
class InterviewSlot(Base):
    """A scheduled interview slot linking application to recruiter + candidate."""
    __tablename__ = "interview_slots"

    id              = Column(Integer,    primary_key=True, autoincrement=True)
    application_id  = Column(Integer,    ForeignKey("applications.id", ondelete="CASCADE"), unique=True)
    scheduled_at    = Column(DateTime,   nullable=False)
    duration_mins   = Column(Integer,    default=45)
    room_id         = Column(String(64), unique=True, nullable=False)  # UUID for WebRTC room
    platform        = Column(String(50), default="FWC Video")
    slot_status     = Column(String(50), default="Pending")
    # Pending → Confirmed | Declined → Completed | Cancelled
    recruiter_notes = Column(Text,       nullable=True)
    decline_reason  = Column(Text,       nullable=True)
    created_at      = Column(DateTime,   default=_now)

    # Relationships
    application     = relationship("Application", back_populates="slot")

    def to_dict(self):
        return {
            "id":              self.id,
            "application_id":  self.application_id,
            "scheduled_at":    self.scheduled_at.isoformat() if self.scheduled_at else None,
            "duration_mins":   self.duration_mins,
            "room_id":         self.room_id,
            "platform":        self.platform,
            "slot_status":     self.slot_status,
            "recruiter_notes": self.recruiter_notes,
            "decline_reason":  self.decline_reason,
            "created_at":      self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────────────────────
class Notification(Base):
    """In-app notification for recruiters and candidates."""
    __tablename__ = "notifications"

    id          = Column(Integer,    primary_key=True, autoincrement=True)
    user_id     = Column(Integer,    ForeignKey("users.id", ondelete="CASCADE"))
    title       = Column(String(255), nullable=False)
    message     = Column(Text,        nullable=False)
    notif_type  = Column(String(30),  default="info")   # info | success | warning | action
    link_page   = Column(String(100), nullable=True)     # frontend route to navigate to
    link_id     = Column(String(50),  nullable=True)     # ID for the linked entity
    is_read     = Column(Boolean,     default=False)
    created_at  = Column(DateTime,    default=_now)

    # Relationships
    user        = relationship("User", back_populates="notifications")

    def to_dict(self):
        return {
            "id":          self.id,
            "title":       self.title,
            "message":     self.message,
            "type":        self.notif_type,
            "link_page":   self.link_page,
            "link_id":     self.link_id,
            "is_read":     self.is_read,
            "created_at":  self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────────────────────
class Candidate(Base):
    __tablename__ = "candidates"

    id                  = Column(String(20),  primary_key=True)
    name                = Column(String(255), nullable=False)
    email               = Column(String(255), unique=True, index=True, nullable=False)
    score               = Column(Integer,     default=0)
    skills_matched      = Column(JSON,        default=list)
    skills_missing      = Column(JSON,        default=list)
    experience_years    = Column(Integer,     default=0)
    resume_name         = Column(String(255), default="Not Uploaded")
    status              = Column(String(50),  default="Applied")
    interview_status    = Column(String(50),  default="Pending")
    interview_score     = Column(Integer,     default=0)
    interview_eval      = Column(JSON,        nullable=True)
    onboarding_progress = Column(Integer,     default=0)
    ai_summary          = Column(Text,        nullable=True)
    semantic_score      = Column(Float,       default=0.0)
    sentiment           = Column(String(50),  nullable=True)
    recruiter_remark    = Column(Text,        nullable=True)
    created_at          = Column(DateTime,    default=_now)

    # New Personal Info fields
    phone               = Column(String(50), nullable=True)
    dob                 = Column(String(50), nullable=True)
    gender              = Column(String(50), nullable=True)
    address             = Column(Text, nullable=True)
    linkedin_profile    = Column(String(255), nullable=True)
    github_profile      = Column(String(255), nullable=True)
    profile_photo       = Column(String(255), nullable=True)

    # 10th Standard Details
    tenth_school        = Column(String(255), nullable=True)
    tenth_board         = Column(String(255), nullable=True)
    tenth_passing_year  = Column(Integer, nullable=True)
    tenth_percentage    = Column(Float, nullable=True)
    tenth_marks_card    = Column(String(255), nullable=True)

    # 12th / PUC Details
    twelfth_college     = Column(String(255), nullable=True)
    twelfth_stream      = Column(String(255), nullable=True)
    twelfth_board       = Column(String(255), nullable=True)
    twelfth_passing_year= Column(Integer, nullable=True)
    twelfth_percentage  = Column(Float, nullable=True)
    twelfth_marks_card  = Column(String(255), nullable=True)

    # Diploma Details (Optional)
    diploma_college     = Column(String(255), nullable=True)
    diploma_branch      = Column(String(255), nullable=True)
    diploma_percentage  = Column(Float, nullable=True)
    diploma_passing_year= Column(Integer, nullable=True)

    # Graduation Details
    grad_college        = Column(String(255), nullable=True)
    grad_degree         = Column(String(255), nullable=True)
    grad_branch         = Column(String(255), nullable=True)
    grad_passing_year   = Column(Integer, nullable=True)
    grad_cgpa           = Column(Float, nullable=True)
    grad_backlogs       = Column(Integer, default=0)

    # Skills & Certifications
    skills_soft         = Column(JSON, default=list)
    certifications      = Column(JSON, default=list)
    internships         = Column(JSON, default=list)
    projects            = Column(JSON, default=list)
    achievements        = Column(JSON, default=list)

    # AI Suggestions / Insights & Video Analytics
    ai_suggestions      = Column(JSON, default=dict)
    video_analytics     = Column(JSON, default=dict)

    # Profile Completion
    profile_completion  = Column(Integer, default=0)   # 0-100%

    # Relationships
    onboarding_tasks    = relationship(
        "OnboardingTask",
        back_populates="candidate",
        cascade="all, delete-orphan",
        order_by="OnboardingTask.order"
    )
    interview_sessions  = relationship(
        "InterviewSession",
        back_populates="candidate",
        cascade="all, delete-orphan"
    )
    applications        = relationship(
        "Application",
        back_populates="candidate",
        cascade="all, delete-orphan"
    )

    def to_dict(self, include_internal: bool = False):
        data = {
            "id":                  self.id,
            "name":                self.name,
            "email":               self.email,
            "score":               self.score,
            "skills_matched":      self.skills_matched or [],
            "skills_missing":      self.skills_missing or [],
            "experience_years":    self.experience_years,
            "resume_name":         self.resume_name,
            "status":              self.status,
            "interview_status":    self.interview_status,
            "interview_score":     self.interview_score,
            "interview_eval":      self.interview_eval,
            "onboarding_progress": self.onboarding_progress,
            "onboarding_tasks":    [t.to_dict() for t in self.onboarding_tasks],
            "ai_summary":          self.ai_summary,
            "semantic_score":      round(self.semantic_score, 2) if self.semantic_score is not None else 0.0,
            "sentiment":           self.sentiment,
            "created_at":          self.created_at.isoformat() if self.created_at else None,

            # New Personal Info
            "phone":               self.phone,
            "dob":                 self.dob,
            "gender":              self.gender,
            "address":             self.address,
            "linkedin_profile":    self.linkedin_profile,
            "github_profile":      self.github_profile,
            "profile_photo":       self.profile_photo,

            # 10th
            "tenth_school":        self.tenth_school,
            "tenth_board":         self.tenth_board,
            "tenth_passing_year":  self.tenth_passing_year,
            "tenth_percentage":    self.tenth_percentage,
            "tenth_marks_card":    self.tenth_marks_card,

            # 12th
            "twelfth_college":     self.twelfth_college,
            "twelfth_stream":      self.twelfth_stream,
            "twelfth_board":       self.twelfth_board,
            "twelfth_passing_year":self.twelfth_passing_year,
            "twelfth_percentage":  self.twelfth_percentage,
            "twelfth_marks_card":  self.twelfth_marks_card,

            # Diploma
            "diploma_college":     self.diploma_college,
            "diploma_branch":      self.diploma_branch,
            "diploma_percentage":  self.diploma_percentage,
            "diploma_passing_year":self.diploma_passing_year,

            # Graduation
            "grad_college":        self.grad_college,
            "grad_degree":         self.grad_degree,
            "grad_branch":         self.grad_branch,
            "grad_passing_year":   self.grad_passing_year,
            "grad_cgpa":           self.grad_cgpa,
            "grad_backlogs":       self.grad_backlogs,

            # Skills & Professional
            "skills_soft":         self.skills_soft or [],
            "certifications":      self.certifications or [],
            "internships":         self.internships or [],
            "projects":            self.projects or [],
            "achievements":        self.achievements or [],

            # Analytics / Suggestions
            "ai_suggestions":      self.ai_suggestions or {},
            "video_analytics":     self.video_analytics or {},

            # Profile Completion
            "profile_completion":  self.profile_completion or 0,
        }
        if include_internal:
            data["recruiter_remark"] = self.recruiter_remark
        return data


# ─────────────────────────────────────────────────────────────
class OnboardingTask(Base):
    __tablename__ = "onboarding_tasks"

    id           = Column(String(50),  primary_key=True)
    candidate_id = Column(String(20),  ForeignKey("candidates.id", ondelete="CASCADE"))
    title        = Column(String(500), nullable=False)
    completed    = Column(Boolean,     default=False)
    order        = Column(Integer,     default=0)

    candidate    = relationship("Candidate", back_populates="onboarding_tasks")

    def to_dict(self):
        return {
            "id":        self.id,
            "title":     self.title,
            "completed": self.completed,
            "order":     self.order
        }


# ─────────────────────────────────────────────────────────────
class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id           = Column(Integer,    primary_key=True, autoincrement=True)
    candidate_id = Column(String(20), ForeignKey("candidates.id", ondelete="CASCADE"))
    questions    = Column(JSON,       default=list)
    created_at   = Column(DateTime,   default=_now)

    candidate    = relationship("Candidate", back_populates="interview_sessions")

    def to_dict(self):
        return {
            "id":           self.id,
            "candidate_id": self.candidate_id,
            "questions":    self.questions or [],
            "created_at":   self.created_at.isoformat() if self.created_at else None
        }


# ─────────────────────────────────────────────────────────────
class AuditLog(Base):
    """System-level audit trail for all critical actions."""
    __tablename__ = "audit_logs"

    id          = Column(Integer,    primary_key=True, autoincrement=True)
    user_id     = Column(Integer,    ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name   = Column(String(255), nullable=True)
    user_role   = Column(String(50),  nullable=True)
    action      = Column(String(100), nullable=False)   # e.g. "candidate.status_update"
    target_type = Column(String(50),  nullable=True)    # "candidate" | "job" | "application" | "user"
    target_id   = Column(String(50),  nullable=True)
    description = Column(Text,        nullable=True)
    ip_address  = Column(String(45),  nullable=True)
    created_at  = Column(DateTime,    default=_now)

    def to_dict(self):
        return {
            "id":          self.id,
            "user_name":   self.user_name,
            "user_role":   self.user_role,
            "action":      self.action,
            "target_type": self.target_type,
            "target_id":   self.target_id,
            "description": self.description,
            "created_at":  self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────────────────────
class ActiveJD(Base):
    __tablename__ = "active_jds"

    id         = Column(Integer,    primary_key=True, autoincrement=True)
    title      = Column(String(255))
    skills     = Column(JSON,       default=list)
    locations  = Column(JSON,       default=list)
    text       = Column(Text)
    is_active  = Column(Boolean,    default=True)
    created_at = Column(DateTime,   default=_now)

    def to_dict(self):
        return {
            "id":        self.id,
            "title":     self.title,
            "skills":    self.skills or [],
            "locations": self.locations or [],
            "text":      self.text,
            "is_active": self.is_active
        }
