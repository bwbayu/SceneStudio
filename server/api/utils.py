from models import (
    DirectorAnalysis,
    SessionResponse,
    SessionState,
)
from fastapi import HTTPException

def _clean_json(text: str) -> str:
    """Strip markdown code fences that some models add around JSON responses."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove opening fence (```json or ```) and closing fence
        start = 1
        end = len(lines)
        if lines[-1].strip() == "```":
            end = len(lines) - 1
        cleaned = "\n".join(lines[start:end])
    return cleaned


def _derive_title(analysis: DirectorAnalysis) -> str:
    """Derive a story title from the Director's narrative summary."""
    # Use the first few words of the narrative summary as the title base,
    # or fall back to genre + setting
    summary_words = analysis.narrative_summary.split()
    if len(summary_words) >= 4:
        return " ".join(summary_words[:4]).rstrip(".,;:") + "..."
    return f"{analysis.genre.title()}: {analysis.setting}"

def _get_session(session: dict[str, SessionState], session_id: str) -> SessionState:
    """Look up a session by ID from the in-memory store. Raises HTTP 404 if not found."""
    session = session.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
    return session

def _to_response(session: SessionState) -> SessionResponse:
    """Convert an in-memory SessionState into the API SessionResponse model."""
    return SessionResponse(
        session_id=session.session_id,
        status=session.status,
        questions=None,  # Only set when status == "questions"
        storyboard=session.storyboard,
        error=session.error,
    )