"""
Shared LLM factory for all MediaGuard agents.

Priority order:
  1. Groq  — llama-3.1-8b-instant      (14,400 req/day, 20,000 TPM — best for batch)
  2. Groq  — llama-3.3-70b-versatile   (fallback, higher quality but lower TPM)
  3. Gemini — gemini-2.0-flash-lite    (last resort)

Why 8b as primary for batch adjudication:
  - 70b has 6,000 TPM limit → hits rate limit after ~3 concurrent calls
  - 8b has 20,000 TPM limit → handles 10+ concurrent calls comfortably
  - For structured JSON tasks (classify/route), 8b quality is sufficient
"""

import os
import time
import logging
from crewai import LLM

logger = logging.getLogger(__name__)

# ─── Model registry ───────────────────────────────────────────────────────────
GROQ_PRIMARY    = "groq/llama-3.1-8b-instant"      # high TPM — good for batch
GROQ_QUALITY    = "groq/llama-3.3-70b-versatile"   # higher quality — for DMCA/contracts
GROQ_FALLBACK   = "groq/llama-3.1-8b-instant"
GEMINI_FALLBACK = "gemini/gemini-2.0-flash-lite"


def make_llm(model: str, temperature: float = 0.1) -> LLM:
    """Build a CrewAI LLM instance for the given model string."""
    groq_key   = os.getenv("GROQ_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    if model.startswith("groq/"):
        if not groq_key:
            raise EnvironmentError("GROQ_API_KEY is not set in .env")
        return LLM(model=model, temperature=temperature, api_key=groq_key)

    if model.startswith("gemini/"):
        if not gemini_key:
            raise EnvironmentError("GEMINI_API_KEY is not set in .env")
        return LLM(model=model, temperature=temperature, api_key=gemini_key)

    return LLM(model=model, temperature=temperature)


def get_primary_llm(temperature: float = 0.1, quality: bool = False) -> LLM:
    """
    Return the best available LLM.
    quality=True → use 70b (for DMCA drafting / contract minting where output quality matters)
    quality=False → use 8b (for batch adjudication where throughput matters)
    """
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key:
        model = GROQ_QUALITY if quality else GROQ_PRIMARY
        return make_llm(model, temperature)
    logger.warning("[LLM Factory] GROQ_API_KEY not set — using Gemini 2.0-flash-lite.")
    return make_llm(GEMINI_FALLBACK, temperature)


# ─── Retry wrapper ────────────────────────────────────────────────────────────
_QUOTA_SIGNALS = ("429", "quota", "resource_exhausted", "rate_limit", "too many requests", "rate limit")

def _is_quota_error(exc: Exception) -> bool:
    return any(sig in str(exc).lower() for sig in _QUOTA_SIGNALS)


def run_with_retry(crew_factory, agent_ref, agent_name: str = "Agent", max_retries: int = 3) -> str:
    """
    Execute a CrewAI crew with exponential backoff on quota/rate-limit errors.

    Fallback chain:
      attempt 0 → primary (8b instant or 70b versatile)
      attempt 1 → wait 15s, switch to 70b versatile
      attempt 2 → wait 30s, switch to gemini-2.0-flash-lite
    """
    groq_key = os.getenv("GROQ_API_KEY", "").strip()

    fallback_chain = [GROQ_PRIMARY, GROQ_QUALITY, GEMINI_FALLBACK] if groq_key \
                     else [GEMINI_FALLBACK, GEMINI_FALLBACK, GEMINI_FALLBACK]

    delay = 15  # shorter initial delay — 8b recovers faster than 70b
    for attempt in range(max_retries):
        try:
            crew   = crew_factory()
            result = crew.kickoff()
            return str(result)

        except Exception as e:
            if _is_quota_error(e) and attempt < max_retries - 1:
                next_model = fallback_chain[min(attempt + 1, len(fallback_chain) - 1)]
                logger.warning(
                    f"[{agent_name}] Rate limit hit (attempt {attempt + 1}/{max_retries}). "
                    f"→ {next_model} in {delay}s…"
                )
                time.sleep(delay)
                delay *= 2
                agent_ref.llm = make_llm(next_model)
            else:
                raise

    raise RuntimeError(f"[{agent_name}] All {max_retries} retry attempts exhausted.")
