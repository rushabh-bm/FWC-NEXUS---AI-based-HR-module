'''app/schemas.py'''
"""Pydantic schemas for the Enterprise AI Recruitment Platform.
These schemas define request/response bodies for candidate registration
steps and verification calculations.
"""

from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field, validator

# ---------------------------------------------------------------------------
# Skill & Certification Schemas
# ---------------------------------------------------------------------------

class SkillSchema(BaseModel):
    """A single skill entry.

    - ``name``: Normalized skill name (e.g. "Machine Learning")
    - ``level``: Optional proficiency level (e.g. "Intermediate")
    - ``certificate_file``: Optional path/URL to an uploaded certificate
    """

    name: str = Field(..., description="Skill name (normalized)")
    level: Optional[str] = Field(None, description="Proficiency level")
    certificate_file: Optional[str] = Field(
        None, description="URL or storage path to a certificate PDF/Image"
    )

    @validator("name")
    def strip_name(cls, v: str) -> str:
        return v.strip()


class CertificationSchema(BaseModel):
    """Certification details for a candidate.

    Fields follow the enterprise requirements: provider, issue/expiry dates,
    credential ID, optional verification URL and file upload.
    """

    name: str = Field(..., description="Certification name")
    provider: str = Field(..., description="Provider / platform (e.g. Coursera)")
    issue_date: date = Field(..., description="Date of issue")
    expiry_date: Optional[date] = Field(None, description="Expiry date, if any")
    credential_id: Optional[str] = Field(
        None, description="Credential or badge identifier"
    )
    certificate_file: Optional[str] = Field(
        None, description="Uploaded certificate file (PDF/Image)"
    )
    verification_url: Optional[str] = Field(
        None, description="URL to verify the certification"
    )

    @validator("name", "provider")
    def strip_strings(cls, v: str) -> str:
        return v.strip()


# ---------------------------------------------------------------------------
# Internship & Project Schemas
# ---------------------------------------------------------------------------

class InternshipSchema(BaseModel):
    title: str = Field(..., description="Internship title")
    company: str = Field(..., description="Company name")
    role: Optional[str] = Field(None, description="Role description")
    start_date: date = Field(..., description="Start date")
    end_date: Optional[date] = Field(None, description="End date (if ongoing, omit)")
    duration_months: Optional[int] = Field(
        None, description="Duration in months – calculated if not supplied"
    )
    technologies: List[str] = Field(default_factory=list, description="Tech stack used")
    description: Optional[str] = Field(None, description="Brief description")
    certificate_file: Optional[str] = Field(
        None, description="Internship certificate upload"
    )
    work_mode: Optional[str] = Field(
        None, description="Remote / Hybrid / Onsite"
    )

    @validator("title", "company")
    def strip_strings(cls, v: str) -> str:
        return v.strip()

    @validator("duration_months", always=True)
    def compute_duration(cls, v, values):
        if v is None and "start_date" in values and "end_date" in values:
            if values["end_date"]:
                delta = values["end_date"] - values["start_date"]
                return delta.days // 30
        return v


class ProjectSchema(BaseModel):
    title: str = Field(..., description="Project title")
    domain: Optional[str] = Field(None, description="Domain or category")
    technologies: List[str] = Field(default_factory=list, description="Tech stack used")
    team_size: Optional[int] = Field(None, description="Number of team members")
    role: Optional[str] = Field(None, description="Candidate role in the project")
    description: Optional[str] = Field(None, description="Project description")
    github_url: Optional[str] = Field(None, description="GitHub repository link")
    live_demo_url: Optional[str] = Field(None, description="Live demo link")
    screenshots: List[str] = Field(default_factory=list, description="Uploaded screenshot URLs")
    start_date: Optional[date] = Field(None, description="Project start date")
    end_date: Optional[date] = Field(None, description="Project end date")
    ai_ml_used: Optional[bool] = Field(False, description="Whether AI/ML was used")
    outcome: Optional[str] = Field(None, description="Outcome or achievements")

    @validator("title")
    def strip_title(cls, v: str) -> str:
        return v.strip()

# ---------------------------------------------------------------------------
# Verification Status Schema
# ---------------------------------------------------------------------------

class VerificationStatusSchema(BaseModel):
    """Current verification status for a candidate.

    ``completion`` is a weighted percentage (0‑100).
    ``level`` is a human‑readable string derived from the weighted score.
    """

    completion: int = Field(..., ge=0, le=100, description="Weighted completion %")
    level: str = Field(..., description="Verification level label")

    @validator("level")
    def validate_level(cls, v: str) -> str:
        return v.strip()

# ---------------------------------------------------------------------------
# Aggregated Registration Schema (used in the registration endpoint)
# ---------------------------------------------------------------------------

class CandidateRegistrationSchema(BaseModel):
    """Top‑level schema for candidate registration.

    This aggregates personal info, education, skills, certifications,
    internships and projects.  Existing fields (name, email, etc.) are kept
    for backward compatibility.
    """

    # Basic personal info (already present in DB)
    id: str = Field(..., description="Candidate UUID / ID")
    name: str
    email: str
    phone: Optional[str] = None
    dob: Optional[str] = None
    address: Optional[str] = None
    linkedin_profile: Optional[str] = None
    github_profile: Optional[str] = None
    profile_photo: Optional[str] = None

    # Education fields (mirrored from DB – omitted for brevity)
    # ... you can extend as needed

    # New sections
    skills: List[SkillSchema] = Field(default_factory=list)
    certifications: List[CertificationSchema] = Field(default_factory=list)
    internships: List[InternshipSchema] = Field(default_factory=list)
    projects: List[ProjectSchema] = Field(default_factory=list)

    # Optional computed verification status (read‑only via GET endpoint)
    verification: Optional[VerificationStatusSchema] = None

    @validator("skills", each_item=True)
    def normalize_skill(cls, v: SkillSchema) -> SkillSchema:
        # Simple normalisation – map common aliases to standard names
        alias_map = {
            "ml": "Machine Learning",
            "py": "Python",
            "js": "JavaScript",
            "aws": "AWS",
        }
        normalized = alias_map.get(v.name.lower(), v.name.title())
        v.name = normalized
        return v

"""End of schemas module"""
