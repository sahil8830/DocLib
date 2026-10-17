"""Read Gemini's structured retry guidance without hiding the original error."""
import math
import re


def retry_delay_seconds(error) -> int:
    """Return a positive RetryInfo/Retry-After delay, defaulting to one minute."""
    candidates = []
    response = getattr(error, "response", None)
    if response is not None:
        candidates.append(response.headers.get("Retry-After"))
    payload = getattr(error, "details", {})
    if isinstance(payload, dict):
        payload = payload.get("error", payload)
        if isinstance(payload, dict):
            for detail in payload.get("details", []):
                if isinstance(detail, dict) and detail.get("@type", "").endswith("RetryInfo"):
                    candidates.append(detail.get("retryDelay"))
    for candidate in candidates:
        if candidate is None:
            continue
        try:
            seconds = float(str(candidate).removesuffix("s"))
            if math.isfinite(seconds) and seconds >= 0:
                return max(1, math.ceil(seconds))
        except (TypeError, ValueError):
            pass
    match = re.search(r"retry in ([\d.]+)s", str(getattr(error, "message", "")), re.I)
    if match:
        try:
            return max(1, math.ceil(float(match.group(1))))
        except ValueError:
            pass
    return 60
