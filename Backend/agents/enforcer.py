import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import time
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

PLATFORM_LEGAL_CONTACTS = {
    "YouTube":   "copyright@youtube.com",
    "TikTok":    "legal@tiktok.com",
    "Twitter":   "copyright@twitter.com",
    "Instagram": "ip@instagram.com",
    "Telegram":  "dmca@telegram.org",
    "Reddit":    "copyright@reddit.com",
    "Other":     "legal@platform.com",
}

_DMCA_PROMPT = """You are a senior IP attorney. Draft a formal DMCA takedown notice using the details below.
Cite 17 U.S.C. § 512(c) and reference the cryptographic FAISS vector proof.
Output ONLY the notice text — no preamble, no markdown.

INCIDENT DETAILS:
- Target Account: {target_account}
- Platform: {platform}
- Legal Contact: {legal_contact}
- Video Title: {video_title}
- Video URL: {video_url}
- Sentinel Confidence: {confidence_score}%
- Classification: {classification}
- Justification: {justification}
- Integrity Hash (FAISS Proof): {integrity_hash}
- Offence Number: {offence_number}

Include:
1. Formal header (To/From/Date/Re)
2. Statement of authority
3. Description of infringement with evidence
4. Cryptographic proof reference
5. Action requested (removal + account strike)
6. If offence_number >= 2: cite 17 U.S.C. § 512(i) repeat infringer policy
7. If offence_number >= 3: add referral to legal counsel
8. Signature block"""

_QUOTA_SIGNALS = ("429", "quota", "resource_exhausted", "rate_limit", "too many requests")

def _is_quota(e: Exception) -> bool:
    return any(s in str(e).lower() for s in _QUOTA_SIGNALS)


def _call_llm(prompt: str) -> str:
    """Direct LLM call — Groq 70b for quality DMCA drafting, fallback to Gemini."""
    groq_key   = os.getenv("GROQ_API_KEY",  "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    if groq_key:
        from groq import Groq
        client = Groq(api_key=groq_key)
        for model, delay in [
            ("llama-3.3-70b-versatile", 0),
            ("llama-3.1-8b-instant",    15),
        ]:
            try:
                if delay:
                    logger.warning(f"[Enforcer] Rate limit — retrying with {model} in {delay}s…")
                    time.sleep(delay)
                resp = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a senior IP attorney. Output only the DMCA notice text."},
                        {"role": "user",   "content": prompt},
                    ],
                    temperature=0.1,
                    max_tokens=1024,
                )
                return resp.choices[0].message.content.strip()
            except Exception as e:
                if _is_quota(e):
                    continue
                raise

    if gemini_key:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        model  = genai.GenerativeModel("gemini-2.0-flash-lite")
        result = model.generate_content(prompt)
        return result.text.strip()

    raise RuntimeError("[Enforcer] No API keys configured.")


def issue_dmca(
    target_account: str,
    platform: str,
    video_title: str,
    video_url: str,
    confidence_score: float,
    classification: str,
    justification: str,
    integrity_hash: str,
    offence_number: int = 1,
) -> dict:
    legal_contact = PLATFORM_LEGAL_CONTACTS.get(platform, PLATFORM_LEGAL_CONTACTS["Other"])

    prompt = _DMCA_PROMPT.format(
        target_account=target_account,
        platform=platform,
        legal_contact=legal_contact,
        video_title=video_title,
        video_url=video_url or "Not provided",
        confidence_score=confidence_score,
        classification=classification,
        justification=justification,
        integrity_hash=integrity_hash or "N/A",
        offence_number=offence_number,
    )

    notice_text = _call_llm(prompt)

    tier = "standard"
    if offence_number >= 3:
        tier = "legal_referral"
    elif offence_number >= 2:
        tier = "expedited"

    return {
        "notice_text":    notice_text,
        "legal_contact":  legal_contact,
        "platform":       platform,
        "target_account": target_account,
        "tier":           tier,
        "offence_number": offence_number,
    }
