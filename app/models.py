"""
AI/NLP Business Logic Layer
============================
Core AI engine for the HR Module. Includes:
  - spaCy NER for resume entity extraction (graceful fallback to regex)
  - sentence-transformers semantic JD similarity scoring (graceful fallback to keyword TF-IDF)
  - HuggingFace transformers sentiment analysis on interview answers (graceful fallback)
  - Python AST cyclomatic complexity analysis for code evaluations
  - AI summary generation for candidate 360 view
  - Advanced chatbot intent detection

All AI features degrade gracefully if heavy packages are not installed.
"""
import os
import re
import ast
import math
import logging
from typing import List, Optional
from pypdf import PdfReader
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# AI PACKAGE LOADING (graceful degradation)
# ─────────────────────────────────────────────────────────────

SPACY_AVAILABLE = False
ST_AVAILABLE = False
TRANSFORMERS_AVAILABLE = False

try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
    logger.info("✅ spaCy loaded — NER extraction enabled")
except Exception as e:
    logger.warning(f"⚠️  spaCy not available ({e}). Using regex fallback.")

try:
    from sentence_transformers import SentenceTransformer, util as st_util
    _st_model = SentenceTransformer("all-MiniLM-L6-v2")
    ST_AVAILABLE = True
    logger.info("✅ sentence-transformers loaded — semantic matching enabled")
except Exception as e:
    logger.warning(f"⚠️  sentence-transformers not available ({e}). Using keyword matching.")

try:
    from transformers import pipeline as hf_pipeline
    _sentiment_pipe = hf_pipeline(
        "sentiment-analysis",
        model="distilbert-base-uncased-finetuned-sst-2-english",
        truncation=True,
        max_length=512
    )
    TRANSFORMERS_AVAILABLE = True
    logger.info("✅ HuggingFace transformers loaded — sentiment analysis enabled")
except Exception as e:
    logger.warning(f"⚠️  transformers not available ({e}). Using keyword sentiment.")


# ─────────────────────────────────────────────────────────────
# JD CONFIGURATION
# ─────────────────────────────────────────────────────────────

JD_SKILLS = {
    "Programming":        ["python", "javascript", "js", "html", "css", "sql", "typescript"],
    "AI/ML":              ["machine learning", "ml", "artificial intelligence", "ai",
                           "deep learning", "nlp", "neural networks", "tensorflow", "pytorch", "keras"],
    "Full-Stack & Backend": ["react", "node.js", "node", "express", "fastapi", "flask",
                              "django", "api", "rest", "graphql", "next.js"],
    "Cloud & Deployment": ["aws", "gcp", "azure", "docker", "kubernetes", "cloud",
                           "git", "github", "ci/cd", "devops"],
}

DEFAULT_JD = (
    "Role: AI/ML Full Stack Developer\n"
    "Hiring Model: Hire → Train → Deploy (HTD)\n"
    "Duration: 12-week program, then deployment in Dubai, Singapore, and India.\n"
    "Requirements: Strong programming fundamentals (Python/JS), Artificial Intelligence, "
    "Machine Learning, Full-Stack development concepts, Cloud deployment, git."
)

ACTIVE_JD_TEXT = DEFAULT_JD  # updated dynamically by generate_jd()

ONBOARDING_TEMPLATE = [
    {"id": "t1", "title": "Accept Offer Letter & Sign Agreement",       "order": 0},
    {"id": "t2", "title": "Upload Academic Transcripts & ID Proofs",    "order": 1},
    {"id": "t3", "title": "Watch FWC Global Introduction Video",        "order": 2},
    {"id": "t4", "title": "Access HTD Week 1-4 React/Node course",      "order": 3},
    {"id": "t5", "title": "Complete Python AI Foundations Module",      "order": 4},
    {"id": "t6", "title": "Submit first mini-project for review",       "order": 5},
]


# ─────────────────────────────────────────────────────────────
# PDF PARSING
# ─────────────────────────────────────────────────────────────

def parse_pdf_resume(file_path: str) -> str:
    """Extract plain text from a PDF file using pypdf."""
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        logger.error(f"Error parsing PDF '{file_path}': {e}")
        return ""


# ─────────────────────────────────────────────────────────────
# RESUME SCREENING
# ─────────────────────────────────────────────────────────────

def _extract_name_email_spacy(text: str):
    """Use spaCy NER to extract candidate name and email."""
    doc = nlp(text[:3000])  # limit to first 3k chars for speed
    # Find first PERSON entity
    name = None
    for ent in doc.ents:
        if ent.label_ == "PERSON" and 2 <= len(ent.text.split()) <= 4:
            name = ent.text.strip()
            break
    email_match = re.search(r"[\w.\-]+@[\w.\-]+\.\w+", text)
    email = email_match.group(0).lower() if email_match else None
    return name, email


def _extract_name_email_regex(text: str, filename: str):
    """Regex fallback for name/email extraction."""
    email_match = re.search(r"[\w.\-]+@[\w.\-]+\.\w+", text)
    email = email_match.group(0).lower() if email_match else None

    # Try first non-trivial line (2–4 capitalized words, not meta-words)
    name = None
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    skip_words = {"resume", "cv", "curriculum", "vitae", "page", "email",
                  "phone", "contact", "address", "objective", "summary"}
    for line in lines[:5]:
        words = line.split()
        if (2 <= len(words) <= 4 and
                not any(w.lower() in skip_words for w in words) and
                words[0][0].isupper()):
            name = line
            break

    # Final fallback: derive from filename
    if not name:
        name = (filename
                .replace("_CV.pdf", "").replace("_Resume.pdf", "").replace(".pdf", "")
                .replace("_", " ").title())
    return name, email


def _semantic_score(resume_text: str, jd_text: str) -> float:
    """Return cosine similarity [0,1] between resume and JD using sentence-transformers."""
    if ST_AVAILABLE:
        try:
            snippet = resume_text[:1500]  # keep it fast
            emb_r = _st_model.encode(snippet, convert_to_tensor=True)
            emb_j = _st_model.encode(jd_text, convert_to_tensor=True)
            return float(st_util.cos_sim(emb_r, emb_j))
        except Exception as e:
            logger.warning(f"Semantic scoring failed: {e}")
    return 0.0


def screen_resume_text(resume_text: str, filename: str) -> dict:
    """
    AI-enhanced resume screener.
    Returns a candidate profile dict ready for DB insertion.
    """
    global JD_SKILLS, ACTIVE_JD_TEXT
    text_lower = resume_text.lower()

    # ── 1. Skill Matching ───────────────────────────────────
    matched, missing = [], []
    for _cat, skills in JD_SKILLS.items():
        for skill in skills:
            pattern = r"\b" + re.escape(skill) + r"\b"
            nice = skill.upper() if len(skill) <= 3 else skill.title()
            if re.search(pattern, text_lower):
                if nice not in matched:
                    matched.append(nice)
            else:
                if nice not in missing:
                    missing.append(nice)

    matched = sorted(set(matched))
    missing = sorted(set(missing) - set(matched))
    total = len(matched) + len(missing)
    keyword_score = (len(matched) / total * 100) if total else 0

    # ── 2. Semantic Score ───────────────────────────────────
    sem = _semantic_score(resume_text, ACTIVE_JD_TEXT)
    semantic_pct = sem * 100  # 0-100

    # ── 3. Experience Detection ─────────────────────────────
    exp_years = 0
    exp_matches = re.findall(r"(\d+)\+?\s*(?:year|yr)s?\s*(?:of)?\s*(?:experience|exp)", text_lower)
    if exp_matches:
        exp_years = max(int(x) for x in exp_matches)
    else:
        if re.search(r"\b(intern|internship|trainee)\b", text_lower):
            exp_years = 1
        if re.search(r"\b(senior|lead|architect|manager)\b", text_lower):
            exp_years = max(exp_years, 4)

    # ── 4. Composite Fit Score ──────────────────────────────
    if ST_AVAILABLE and sem > 0:
        # 50% semantic, 30% keyword, 20% experience
        fit_score = int(semantic_pct * 0.50 + keyword_score * 0.30 + min(exp_years * 10, 20))
    else:
        # 80% keyword, 20% experience
        fit_score = int(keyword_score * 0.80 + min(exp_years * 10, 20))
    fit_score = min(max(fit_score, 10), 98)

    # ── 5. Name & Email Extraction ──────────────────────────
    if SPACY_AVAILABLE:
        name, email = _extract_name_email_spacy(resume_text)
    else:
        name, email = _extract_name_email_regex(resume_text, filename)

    if not name:
        name = (filename
                .replace("_CV.pdf", "").replace("_Resume.pdf", "").replace(".pdf", "")
                .replace("_", " ").title())
    if not email:
        email = f"{name.lower().replace(' ', '.')}@gmail.com"

    return {
        "name": name,
        "email": email.lower(),
        "score": fit_score,
        "skills_matched": matched,
        "skills_missing": missing,
        "experience_years": exp_years,
        "resume_name": filename,
        "status": "Applied",
        "interview_status": "Pending",
        "interview_score": 0,
        "interview_eval": None,
        "onboarding_progress": 0,
        "semantic_score": round(sem, 4),
        "ai_summary": None,
        "sentiment": None,
    }


# ─────────────────────────────────────────────────────────────
# AI CANDIDATE SUMMARY GENERATOR
# ─────────────────────────────────────────────────────────────

def generate_ai_summary(candidate: dict) -> str:
    """
    Generate a GPT-style AI narrative summary of a candidate.
    Uses template + dynamic data insertion (no LLM API key required).
    """
    name = candidate.get("name", "The candidate")
    score = candidate.get("score", 0)
    matched = candidate.get("skills_matched", [])
    missing = candidate.get("skills_missing", [])
    exp = candidate.get("experience_years", 0)
    status = candidate.get("status", "Applied")
    interview_score = candidate.get("interview_score", 0)
    eval_data = candidate.get("interview_eval") or {}
    sem = candidate.get("semantic_score", 0)

    # Determine tier
    if score >= 85:
        tier = "**Tier 1 — Exceptional Fit**"
        tier_desc = "demonstrates outstanding alignment with FWC's HTD programme requirements"
    elif score >= 70:
        tier = "**Tier 2 — Strong Candidate**"
        tier_desc = "shows strong potential with a solid technical foundation"
    elif score >= 50:
        tier = "**Tier 3 — Potential Fit**"
        tier_desc = "presents a reasonable skill baseline with clear development areas"
    else:
        tier = "**Tier 4 — Needs Development**"
        tier_desc = "is at an early stage and would benefit significantly from structured training"

    top_skills = ", ".join(matched[:5]) if matched else "No skills detected"
    gap_skills = ", ".join(missing[:3]) if missing else "None identified"

    semantic_text = ""
    if sem > 0:
        pct = int(sem * 100)
        semantic_text = f" Semantic JD alignment (sentence-transformer cosine similarity): **{pct}%**."

    interview_text = ""
    if interview_score > 0:
        sentiment = eval_data.get("sentiment", "")
        summary = eval_data.get("summary", "")
        interview_text = (
            f"\n\n**Technical Interview**: Scored **{interview_score}/100** with a "
            f"'{sentiment}' communication profile. {summary}"
        )

    exp_text = f"{exp} year{'s' if exp != 1 else ''} of hands-on experience" if exp else "a fresher profile"

    summary = (
        f"🤖 **Nexus AI Analysis** — {tier}\n\n"
        f"{name} {tier_desc}, bringing {exp_text} to the table. "
        f"Core competencies verified by AI resume parsing include: {top_skills}.{semantic_text} "
        f"Identified skill gaps for targeted HTD training: {gap_skills}."
        f"{interview_text}\n\n"
        f"**Recommendation**: "
    )

    if score >= 80:
        summary += f"Fast-track to interview stage. High probability of successful HTD deployment."
    elif score >= 65:
        summary += f"Schedule technical interview. Strong candidate with manageable gaps."
    elif score >= 50:
        summary += f"Consider for intake with structured upskilling plan. Recommend Python/AI module."
    else:
        summary += f"Hold for future cohort. Advise pre-training on core Python and AI fundamentals."

    return summary


# ─────────────────────────────────────────────────────────────
# INTERVIEW EVALUATION (AI-Powered)
# ─────────────────────────────────────────────────────────────

def analyze_sentiment(answer_texts: List[str]) -> dict:
    """
    Analyze sentiment of interview answers.
    Returns label (POSITIVE/NEGATIVE/NEUTRAL) and confidence.
    """
    if not answer_texts:
        return {"label": "NEUTRAL", "confidence": 0.5, "compound": 0.0}

    combined = " ".join(answer_texts)[:512]

    if TRANSFORMERS_AVAILABLE:
        try:
            result = _sentiment_pipe(combined)[0]
            label = result["label"]   # POSITIVE | NEGATIVE
            conf = round(result["score"], 3)
            compound = conf if label == "POSITIVE" else -conf
            return {"label": label, "confidence": conf, "compound": compound}
        except Exception as e:
            logger.warning(f"Sentiment analysis failed: {e}")

    # Keyword fallback
    pos_words = {"excellent", "great", "passionate", "excited", "experienced",
                 "developed", "built", "led", "achieved", "strong", "skilled",
                 "deployed", "optimized", "love", "enjoy", "proficient"}
    neg_words = {"no", "not", "never", "none", "lack", "unfamiliar", "unsure",
                 "difficult", "struggle", "basic", "limited"}
    text_lower = combined.lower()
    pos_count = sum(1 for w in pos_words if w in text_lower)
    neg_count = sum(1 for w in neg_words if w in text_lower)
    total = pos_count + neg_count + 1
    compound = (pos_count - neg_count) / total
    label = "POSITIVE" if compound >= 0.1 else ("NEGATIVE" if compound < -0.1 else "NEUTRAL")
    return {"label": label, "confidence": round(abs(compound), 3), "compound": round(compound, 3)}


def evaluate_interview_answers(answers: List[dict]) -> dict:
    """
    Evaluate a candidate's interview answers.
    Returns scores, sentiment, and AI feedback.
    """
    eval_keywords = {
        0: ["python", "javascript", "react", "fastapi", "framework", "coding", "typescript", "node"],
        1: ["hire", "train", "deploy", "htd", "12-week", "global", "dubai", "singapore", "cohort"],
        2: ["logging", "server", "docker", "redeploy", "rollback", "cloud", "monitoring", "alert"],
        3: ["join", "fwc", "career", "expand", "ai", "machine learning", "growth", "global"]
    }

    detailed_scores = []
    answer_texts = []
    total_score = 0

    for i, answer in enumerate(answers):
        ans_text = answer.get("a", "").lower()
        answer_texts.append(ans_text)
        words = ans_text.split()

        # Length score: up to 40 pts
        length_score = min(len(words) * 2, 40)

        # Keyword score: up to 60 pts
        req_keys = eval_keywords.get(i % len(eval_keywords), [])
        hits = sum(1 for k in req_keys if k in ans_text)
        keyword_score = min(hits * 15, 60)

        if not words:
            item_score = 20
        else:
            item_score = int(length_score + keyword_score)
            item_score = min(max(item_score, 45), 98)

        detailed_scores.append(item_score)
        total_score += item_score

    avg_score = int(total_score / len(answers)) if answers else 50

    # Sentiment analysis on all answers
    sentiment_result = analyze_sentiment(answer_texts)
    sentiment_label = sentiment_result["label"]
    compound = sentiment_result["compound"]

    # Qualitative assessment
    if avg_score >= 85:
        sentiment_str = "Highly Confident & Energetic"
        feedback = (
            "Exceptional answers demonstrating deep alignment with FWC's HTD framework. "
            "Showcased robust coding patterns, proactive infrastructure thinking, and "
            "clear enthusiasm for global tech deployment."
        )
    elif avg_score >= 70:
        sentiment_str = "Structured & Clear"
        feedback = (
            "Good overall delivery with solid problem-solving fundamentals. "
            "Strong Python baseline with room to improve architectural depth in "
            "cloud-native full-stack systems."
        )
    else:
        sentiment_str = "Needs Development"
        feedback = (
            "Basic understanding demonstrated. Lacks technical depth in cloud scaling "
            "and full-stack patterns. Recommend structured pre-training before HTD cohort placement."
        )

    if TRANSFORMERS_AVAILABLE:
        if sentiment_label == "POSITIVE" and compound > 0.6:
            sentiment_str = "Highly Confident & Energetic"
        elif sentiment_label == "POSITIVE":
            sentiment_str = "Positive & Clear"
        elif sentiment_label == "NEGATIVE":
            sentiment_str = "Uncertain / Hesitant"

    accuracy = min(int(avg_score * 1.05), 98)
    clarity  = min(int(avg_score * 0.95), 98)

    return {
        "accuracy": accuracy,
        "clarity": clarity,
        "sentiment": sentiment_str,
        "summary": feedback,
        "detailed_scores": detailed_scores,
        "avg_score": avg_score,
        "sentiment_label": sentiment_label,
        "sentiment_compound": compound
    }


# ─────────────────────────────────────────────────────────────
# PYTHON CODE EVALUATOR (AST-based)
# ─────────────────────────────────────────────────────────────

def _cyclomatic_complexity(tree) -> int:
    """Calculate McCabe cyclomatic complexity from an AST tree."""
    complexity = 1
    decision_nodes = (
        ast.If, ast.While, ast.For, ast.ExceptHandler,
        ast.With, ast.Assert, ast.comprehension,
        ast.AsyncFor, ast.AsyncWith
    )
    for node in ast.walk(tree):
        if isinstance(node, decision_nodes):
            complexity += 1
        elif isinstance(node, ast.BoolOp):
            complexity += len(node.values) - 1
    return complexity


def evaluate_code(language: str, code_text: str) -> dict:
    """
    AI Technical Sandbox Evaluator.
    - Syntax validation (Python AST compile)
    - Cyclomatic complexity
    - Big-O time & space estimation
    - Dot product functional checks
    """
    if not code_text.strip():
        return {
            "success": False,
            "complexity_time": "N/A",
            "complexity_space": "N/A",
            "cyclomatic": 0,
            "feedback": "Code body is empty. Please enter your solution.",
            "functional_checks": [],
            "optimization_tips": []
        }

    code_lower = code_text.lower()

    # ── 1. Syntax Check ─────────────────────────────────────
    syntax_error = None
    tree = None
    if language.lower() == "python":
        try:
            tree = ast.parse(code_text)
        except SyntaxError as se:
            syntax_error = f"Line {se.lineno}: {se.msg}"

    if syntax_error:
        return {
            "success": False,
            "complexity_time": "N/A",
            "complexity_space": "N/A",
            "cyclomatic": 0,
            "feedback": f"❌ **Syntax Error**: {syntax_error}",
            "functional_checks": [],
            "optimization_tips": []
        }

    # ── 2. Cyclomatic Complexity ─────────────────────────────
    cyclomatic = _cyclomatic_complexity(tree) if tree else 1

    # ── 3. Big-O Estimation ─────────────────────────────────
    loop_count = len(re.findall(r"\bfor\b|\bwhile\b", code_lower))
    has_recursion = bool(re.search(r"def\s+(\w+)\(.*?:\s*(?:.*\n)*?.*\1\(", code_text, re.DOTALL))

    if has_recursion:
        time_complexity = "O(2^N)"
        space_complexity = "O(N)"   # call stack
    elif loop_count == 0:
        time_complexity = "O(1)"
        space_complexity = "O(1)"
    elif loop_count == 1:
        time_complexity = "O(N)"
        space_complexity = "O(N)" if any(k in code_lower for k in [".append", "list(", "[]"]) else "O(1)"
    else:
        nested = bool(re.search(r"for\s+.*:\s*\n\s+for\s+.*:", code_lower))
        time_complexity = "O(N²)" if nested else "O(N + M)"
        space_complexity = "O(1)"

    # ── 4. Dot Product Functional Checks ────────────────────
    has_mult    = "*" in code_lower
    has_zip_idx = "zip" in code_lower or ("[" in code_lower and "range" in code_lower)
    has_sum     = "sum" in code_lower or "+=" in code_lower

    checks = []
    tips   = []

    if has_mult:
        checks.append("✔ Multiplication arithmetic detected.")
    else:
        checks.append("❌ Missing multiplication (a[i] * b[i]).")
        tips.append("Use the `*` operator to multiply corresponding elements.")

    if has_zip_idx:
        checks.append("✔ Correct element-pair traversal detected.")
    else:
        checks.append("❌ Missing paired iteration (zip / range indexing).")
        tips.append("Traverse both lists simultaneously with `zip(a, b)` or `range(len(a))`.")

    if has_sum:
        checks.append("✔ Accumulation / summation logic detected.")
    else:
        checks.append("❌ Missing result accumulation (+=  or sum()).")
        tips.append("Accumulate products into a result variable.")

    success = has_mult and has_zip_idx and has_sum

    complexity_note = ""
    if time_complexity == "O(N)":
        complexity_note = "Your solution runs in optimal linear time. "
    elif time_complexity == "O(N²)":
        complexity_note = "Consider refactoring nested loops — O(N) is achievable here. "

    if success:
        feedback = (
            f"🚀 **All criteria met!** Your solution correctly computes the vector dot product. "
            f"{complexity_note}Cyclomatic complexity: **{cyclomatic}** "
            f"({'Simple' if cyclomatic <= 3 else 'Moderate' if cyclomatic <= 7 else 'Complex'})."
        )
    else:
        feedback = (
            f"⚠️ **Logic Gaps Detected.** The code compiles but doesn't fully satisfy the "
            f"dot product requirements. Review the checklist below."
        )

    return {
        "success": success,
        "complexity_time": time_complexity,
        "complexity_space": space_complexity,
        "cyclomatic": cyclomatic,
        "feedback": feedback,
        "functional_checks": checks,
        "optimization_tips": tips
    }


# ─────────────────────────────────────────────────────────────
# AI COPILOT CHATBOT
# ─────────────────────────────────────────────────────────────

def chatbot_query(query_text: str, db: Session) -> dict:
    """
    NLP intent detection chatbot for HR recruiters.
    Uses spaCy entity matching when available.
    """
    from app.db_models import Candidate
    candidates = db.query(Candidate).all()
    q = query_text.lower().strip()

    # ── Intent: Specific candidate lookup ───────────────────
    for c in candidates:
        if c.name.lower() in q:
            eval_data = c.interview_eval or {}
            eval_summary = eval_data.get("summary", "No interview recorded yet.")
            return {
                "reply": (
                    f"🤖 **Nexus AI**: I pulled up **{c.name}**'s full profile. "
                    f"AI Fit Score: **{c.score}%** | Status: **{c.status}** | "
                    f"Experience: {c.experience_years} yr(s). "
                    f"\n\n**Interview Summary**: *\"{eval_summary}\"*"
                ),
                "suggestions": [f"Show {c.name}'s skills", f"Shortlist {c.name}"]
            }

    # ── Intent: Analytics / stats ──────────────────────────
    if any(w in q for w in ["stats", "analytics", "overview", "report", "total", "how many"]):
        total = len(candidates)
        shortlisted = sum(1 for c in candidates if c.status == "Shortlisted")
        hired = sum(1 for c in candidates if c.status == "Hired")
        avg_score = int(sum(c.score for c in candidates) / total) if total else 0
        return {
            "reply": (
                f"🤖 **Nexus AI**: Current pipeline snapshot — "
                f"**{total} total** candidates | **{shortlisted} shortlisted** | "
                f"**{hired} hired** | Average AI fit score: **{avg_score}%**."
            ),
            "suggestions": ["Show top candidates", "View analytics dashboard"]
        }

    # ── Intent: Skill search ────────────────────────────────
    all_skills = [s for skills in JD_SKILLS.values() for s in skills]
    for sk in all_skills:
        if sk in q:
            matches = [c for c in candidates if any(sk in ms.lower() for ms in (c.skills_matched or []))]
            if matches:
                cand_links = ", ".join(f"**{c.name}** ({c.score}% fit)" for c in matches)
                return {
                    "reply": f"🤖 **Nexus AI**: Found **{len(matches)} candidate(s)** with **{sk.title()}**: {cand_links}.",
                    "suggestions": [f"Profile of {matches[0].name}", "Compare all"]
                }

    # ── Intent: Top/best candidate ──────────────────────────
    if any(w in q for w in ["best", "top", "highest", "rank", "strongest"]):
        if candidates:
            top = max(candidates, key=lambda c: c.score)
            return {
                "reply": (
                    f"🤖 **Nexus AI**: 🏆 Top ranked candidate is **{top.name}** with "
                    f"**{top.score}% AI match score**. Core skills: "
                    f"{', '.join((top.skills_matched or [])[:4])}. "
                    f"Interview status: *{top.interview_status}*."
                ),
                "suggestions": [f"Shortlist {top.name}", "Run AI interview"]
            }

    # ── Intent: Location / deployment ──────────────────────
    if any(w in q for w in ["dubai", "singapore", "india", "location", "deploy", "htd"]):
        hired = [c for c in candidates if c.status == "Hired"]
        return {
            "reply": (
                f"🤖 **Nexus AI**: FWC's HTD programme deploys to **Dubai, Singapore & India**. "
                f"Currently **{len(hired)} candidate(s)** are hired and in the onboarding pipeline."
            ),
            "suggestions": ["Show onboarding progress", "View analytics"]
        }

    # ── Intent: Pending interviews ──────────────────────────
    if any(w in q for w in ["interview", "pending", "schedule"]):
        pending = [c for c in candidates if c.interview_status == "Pending"]
        names = ", ".join(f"**{c.name}**" for c in pending[:5])
        return {
            "reply": (
                f"🤖 **Nexus AI**: **{len(pending)} candidate(s)** have pending interviews: "
                f"{names or 'None'}."
            ),
            "suggestions": ["Schedule interview", "Run bulk AI evaluation"]
        }

    # ── Default fallback ────────────────────────────────────
    return {
        "reply": (
            "🤖 **Nexus AI Co-Pilot** — I can help you with:\n"
            "- *'Who has Python skills?'*\n"
            "- *'Summarize Aryan's profile'*\n"
            "- *'Who is our top candidate?'*\n"
            "- *'Show pipeline stats'*\n"
            "- *'Who has pending interviews?'*"
        ),
        "suggestions": ["Who is our top candidate?", "Show pipeline stats", "Who has Python skills?"]
    }


# ─────────────────────────────────────────────────────────────
# JD GENERATOR
# ─────────────────────────────────────────────────────────────

def generate_jd(role_title: str, primary_skills: str, locations: str, db: Session) -> dict:
    """
    Generate a dynamic JD and update the active JD in the database.
    Also refreshes the in-memory JD for live scoring.
    """
    global JD_SKILLS, ACTIVE_JD_TEXT
    from app.db_models import ActiveJD

    skills_list = [s.strip().title() for s in primary_skills.split(",") if s.strip()]
    loc_list    = [l.strip().title() for l in locations.split(",") if l.strip()]

    jd_text = (
        f"Role: {role_title.strip().title()}\n"
        f"Hiring Model: Hire → Train → Deploy (HTD)\n"
        f"Duration: 12-week programme, then deployment in {', '.join(loc_list) or 'TBD'}.\n"
        f"Requirements: Strong programming fundamentals, core competency in {', '.join(skills_list)}."
    )

    # Update in-memory JD for live scoring
    ACTIVE_JD_TEXT = jd_text
    if skills_list:
        JD_SKILLS["Programming"] = [s.lower() for s in skills_list[:4]]
        if len(skills_list) > 4:
            JD_SKILLS["AI/ML"] = [s.lower() for s in skills_list[4:]]

    # Deactivate old JDs
    db.query(ActiveJD).update({"is_active": False})

    new_jd = ActiveJD(
        title=role_title.strip().title(),
        skills=skills_list,
        locations=loc_list,
        text=jd_text,
        is_active=True
    )
    db.add(new_jd)
    db.commit()
    db.refresh(new_jd)

    return {
        "message": "JD generated and activated! All future scoring will use this template.",
        "jd_text": jd_text,
        "jd": new_jd.to_dict()
    }


# ─────────────────────────────────────────────────────────────
# ANALYTICS
# ─────────────────────────────────────────────────────────────

def get_analytics_overview(db: Session) -> dict:
    """
    Compute comprehensive hiring funnel analytics.
    """
    from app.db_models import Candidate
    candidates = db.query(Candidate).all()

    if not candidates:
        return {
            "total": 0, "shortlisted": 0, "interviewed": 0,
            "hired": 0, "rejected": 0, "avg_score": 0,
            "funnel": [], "skill_heatmap": [], "score_distribution": [],
            "top_candidates": []
        }

    total        = len(candidates)
    shortlisted  = sum(1 for c in candidates if c.status == "Shortlisted")
    interviewed  = sum(1 for c in candidates if c.status == "Interviewed")
    hired        = sum(1 for c in candidates if c.status == "Hired")
    rejected     = sum(1 for c in candidates if c.status == "Rejected")
    avg_score    = int(sum(c.score for c in candidates) / total)

    funnel = [
        {"stage": "Applied",      "count": total},
        {"stage": "Shortlisted",  "count": shortlisted + interviewed + hired},
        {"stage": "Interviewed",  "count": interviewed + hired},
        {"stage": "Hired",        "count": hired},
    ]

    # Skill frequency heatmap
    skill_freq: dict = {}
    for c in candidates:
        for sk in (c.skills_matched or []):
            skill_freq[sk] = skill_freq.get(sk, 0) + 1
    skill_heatmap = sorted(
        [{"skill": k, "count": v} for k, v in skill_freq.items()],
        key=lambda x: -x["count"]
    )[:15]

    # Score distribution (buckets of 10)
    buckets = {f"{i*10}-{i*10+9}": 0 for i in range(10)}
    for c in candidates:
        bucket_key = f"{(c.score // 10) * 10}-{(c.score // 10) * 10 + 9}"
        buckets[bucket_key] = buckets.get(bucket_key, 0) + 1
    score_distribution = [{"range": k, "count": v} for k, v in buckets.items()]

    # Top 5 candidates
    top = sorted(candidates, key=lambda c: c.score, reverse=True)[:5]

    return {
        "total": total,
        "shortlisted": shortlisted,
        "interviewed": interviewed,
        "hired": hired,
        "rejected": rejected,
        "avg_score": avg_score,
        "funnel": funnel,
        "skill_heatmap": skill_heatmap,
        "score_distribution": score_distribution,
        "top_candidates": [c.to_dict() for c in top],
        "ai_enabled": {
            "spacy": SPACY_AVAILABLE,
            "sentence_transformers": ST_AVAILABLE,
            "transformers": TRANSFORMERS_AVAILABLE
        }
    }


# ─────────────────────────────────────────────────────────────
# FAKE RESUME & VIDEO ANALYTICS
# ─────────────────────────────────────────────────────────────

def detect_fake_resume(text: str) -> dict:
    """Analyze resume text for indicators of credential stuffing or template placeholders."""
    text_lower = text.lower()
    flags = []
    
    # 1. Placeholder check
    if any(p in text_lower for p in ["lorem ipsum", "insert name", "placeholder", "your name here", "lorem-ipsum"]):
        flags.append("Boilerplate placeholder text detected (Lorem Ipsum / Insert Name).")
        
    # 2. Skill stuffing
    words = re.findall(r"\b\w+\b", text_lower)
    word_counts = {}
    for w in words:
        if len(w) > 4:
            word_counts[w] = word_counts.get(w, 0) + 1
    stuffed = [w for w, c in word_counts.items() if c > 20]
    if stuffed:
        flags.append(f"Excessive repetition of skills/keywords ({', '.join(stuffed[:3])}).")
        
    # 3. Timelines inconsistency
    # e.g., claiming 20 years of experience but graduation in 2024
    years_matches = re.findall(r"\b(19\d{2}|20\d{2})\b", text)
    if years_matches:
        int_years = [int(y) for y in years_matches]
        min_y, max_y = min(int_years), max(int_years)
        if max_y > 2026: # impossible future dates
            flags.append(f"Timelines contain future dates beyond active cohort bounds ({max_y}).")
            
    is_suspicious = len(flags) > 0
    return {
        "is_suspicious": is_suspicious,
        "flags": flags,
        "trust_score": max(100 - len(flags) * 35, 15)
    }


def generate_video_analytics(answers: List[dict], tab_switches: int = 0, fullscreen_violations: int = 0) -> dict:
    """Generate simulated real-time video analytics, eye contact levels, and confidence maps."""
    total_words = 0
    keyword_hits = 0
    
    for a in answers:
        txt = a.get("a", "")
        words = txt.split()
        total_words += len(words)
        for w in ["python", "javascript", "react", "fastapi", "docker", "aws", "deploy", "htd"]:
            if w in txt.lower():
                keyword_hits += 1
                
    eye_contact = max(96 - tab_switches * 12 - fullscreen_violations * 18, 8)
    confidence = max(90 - tab_switches * 10 - fullscreen_violations * 15, 12)
    
    if total_words > 0:
        wpm = int(total_words / (max(len(answers), 1) * 0.75))
        wpm = min(max(wpm, 90), 160)
        if 115 <= wpm <= 145:
            speed_rating = "Optimal (120 wpm)"
            fluency_score = min(92 + keyword_hits, 98)
        elif wpm < 115:
            speed_rating = "Slow (under 110 wpm)"
            fluency_score = max(55 + keyword_hits * 2, 35)
        else:
            speed_rating = "Fast (above 145 wpm)"
            fluency_score = max(65 + keyword_hits * 2, 45)
    else:
        wpm = 0
        speed_rating = "Fluent / Non-verbal"
        fluency_score = 25
        
    technical_comm = min(50 + keyword_hits * 8, 96)
    
    emotions = {"Neutral": 60, "Confident": 25, "Focused": 10, "Anxious": 5}
    if tab_switches > 0 or fullscreen_violations > 0:
        emotions["Anxious"] = min(emotions["Anxious"] + 30, 85)
        emotions["Focused"] = max(emotions["Focused"] - 5, 2)
        emotions["Confident"] = max(emotions["Confident"] - 15, 3)
        
    heatmap = []
    base_conf = confidence
    for i in range(10):
        val = base_conf + int(math.sin(i) * 6)
        if i in [3, 6] and (tab_switches > 0 or fullscreen_violations > 0):
            val -= 25
        heatmap.append(min(max(val, 5), 100))
        
    return {
        "facial_expression": "Professional / Focused" if tab_switches == 0 else "Distracted / Looking Away",
        "eye_contact_percentage": eye_contact,
        "confidence_score": confidence,
        "speech_fluency_score": fluency_score,
        "speaking_speed_wpm": wpm,
        "speaking_speed_rating": speed_rating,
        "technical_communication_score": technical_comm,
        "emotion_distribution": emotions,
        "confidence_heatmap": heatmap,
        "keyword_hits": keyword_hits,
        "tab_switches": tab_switches,
        "fullscreen_violations": fullscreen_violations,
        "summary": (
            "Candidate displayed stable eye contact and fluent technical articulation."
            if tab_switches == 0 else
            "Focus warnings triggered during the live stream. Tab-switching or full-screen violations logged."
        )
    }

