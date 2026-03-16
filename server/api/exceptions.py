"""Custom exceptions for API key and service errors."""


class GeminiApiKeyError(Exception):
    """Raised when a Gemini API key is invalid, expired, or unauthorized."""
    pass


def raise_if_api_key_error(exc: Exception) -> None:
    """Check if an exception indicates an API key problem and re-raise as GeminiApiKeyError."""
    msg = str(exc).lower()
    keywords = (
        "api key not valid",
        "permission denied",
        "unauthenticated",
        "invalid api key",
        "api_key_invalid",
        "forbidden",
        "unauthorized",
    )
    if any(kw in msg for kw in keywords):
        raise GeminiApiKeyError(f"Invalid or unauthorized Gemini API key: {exc}") from exc
