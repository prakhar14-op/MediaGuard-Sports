import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import re
import time
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Direct LLM call — no CrewAI agent loop needed for JSON classification ────
# CrewAI's agent loop causes "Maximum iterations reached" errors on simple tasks.
# We call Groq/Gemini directly for reliability and speed.

_QUOTA_SIGNALS = ("429", "quota", "resource_exhausted", "rate_limit", "too many requests")

def _is_quota(e: Exception) -> bool:
    return any(s in str(e).lower() for s in _QUOTA_SIGNALS)


def _call_llm(prompt: str) -> str:
    """
    Try Groq first (llama-3.1-8b-instant — 20k TPM),
    fall back to Groq 70b, then Gemini 2.0-flash-lite.
    """
    groq_key   = os.getenv("GROQ_API_KEY",   "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY",  "").strip()

    # ── Attempt 1 & 2: Groq ──────────────────────────────────────────────────
    if groq_key:
        from groq import Groq
        client = Groq(api_key=groq_key)

        for model, delay in [
            ("llama-3.1-8b-instant",    0),
            ("llama-3.3-70b-versatile", 15),
        ]:
            try:
                if delay:
                    logger.warning(f"[Adjudicator] Groq rate limit — retrying with {model} in {delay}s…")
                    time.sleep(delay)
                resp = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a strict IP law AI. Output ONLY valid JSON. No markdown, no explanation."},
                        {"role": "user",   "content": prompt},
                    ],
                    temperature=0.1,
                    max_tokens=512,
                )
                return resp.choices[0].message.content.strip()
            except Exception as e:
                if _is_quota(e):
                    continue   # try next model
                raise          # non-quota error — propagate

    # ── Attempt 3: Gemini fallback ────────────────────────────────────────────
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model  = genai.GenerativeModel("gemini-2.0-flash-lite")
            result = model.generate_content(prompt)
            return result.text.strip()
        except Exception as e:
            raise RuntimeError(f"[Adjudicator] All LLM backends failed. Last error: {e}")

    raise RuntimeError("[Adjudicator] No API keys configured (GROQ_API_KEY or GEMINI_API_KEY).")


_VERDICT_PROMPT = """Analyze this IP infringement incident and return ONLY a JSON object.
No markdown fences, no explanation outside the JSON.

INCIDENT CONTEXT:
- Sentinel Report: {sentinel_report}
- Platform: {platform}
- Account: {account_handle}
- Video Title: {video_title}
- Description: {description}
- Country: {country}
- Sentinel Confidence: {confidence_score}%
- Low Confidence Flag: {low_confidence}

Return exactly this JSON structure:
{{
  "classification": "SEVERE PIRACY" or "FAIR USE / FAN CONTENT",
  "risk_score": <integer 0-100, where 100 = definite piracy>,
  "justification": "<1-2 sentences>",
  "routing": "Enforcer" or "Broker",
  "legal_basis": "<brief legal principle>",
  "recommended_action": "<one concrete action>"
}}"""


def _parse_verdict(raw: str) -> dict:
    """Extract JSON from LLM output even if wrapped in markdown fences."""
    raw = raw.strip()
    # Strip markdown fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON in Adjudicator output: {raw[:300]}")
    return json.loads(match.group())


def adjudicate(
    sentinel_report: str,
    platform: str,
    account_handle: str,
    video_title: str,
    description: str = "",
    country: str = "",
    confidence_score: float = 100.0,
) -> dict:
    low_confidence = confidence_score < 70.0

    prompt = _VERDICT_PROMPT.format(
        sentinel_report=sentinel_report,
        platform=platform,
        account_handle=account_handle,
        video_title=video_title,
        description=(description or "Not provided")[:400],  # truncate long descriptions
        country=country or "Unknown",
        confidence_score=confidence_score,
        low_confidence=low_confidence,
    )

    raw_text = _call_llm(prompt)
    verdict  = _parse_verdict(raw_text)

    # Low-confidence leniency — don't issue DMCA if Sentinel wasn't sure
    if low_confidence and verdict.get("routing") == "Enforcer":
        verdict["routing"]            = "Broker"
        verdict["recommended_action"] = "Flag for human review before issuing DMCA (low Sentinel confidence)"

    return verdict


def batch_adjudicate(incidents: list) -> list:
    """Adjudicate multiple incidents sequentially with a small inter-call delay."""
    results = []
    for i, inc in enumerate(incidents):
        # Small delay between calls to avoid TPM bursts
        if i > 0:
            time.sleep(2)
        try:
            verdict = adjudicate(
                sentinel_report  = inc.get("sentinel_report", ""),
                platform         = inc.get("platform", "Unknown"),
                account_handle   = inc.get("account_handle", "Unknown"),
                video_title      = inc.get("video_title", "Unknown"),
                description      = inc.get("description", ""),
                country          = inc.get("country", ""),
                confidence_score = inc.get("confidence_score", 100.0),
            )
            results.append({"incident_id": inc.get("incident_id"), "verdict": verdict, "error": None})
        except Exception as e:
            logger.error(f"[Adjudicator] Failed for {inc.get('account_handle')}: {e}")
            results.append({"incident_id": inc.get("incident_id"), "verdict": None, "error": str(e)})
    return results
