import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import re
import time
import secrets
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

PLATFORM_CPM = {
    "YouTube":   4.50,
    "TikTok":    0.02,
    "Twitter":   0.50,
    "Instagram": 1.20,
    "Telegram":  0.10,
    "Reddit":    0.30,
    "Other":     0.50,
}

_CONTRACT_PROMPT = """You are a Web3 revenue broker and IP licensing specialist.
Draft a smart contract licensing agreement for the following Fair Use content.
Output ONLY a JSON object — no markdown fences, no prose outside the JSON.

DEAL CONTEXT:
- Creator Account: {target_account}
- Platform: {platform}
- Video Title: {video_title}
- View Count: {view_count}
- Engagement Tier: {tier}
- Copyright Holder Share: {copyright_holder_share}%
- Creator Share: {creator_share}%
- Justification: {justification}
- Estimated Monthly Revenue: ${estimated_monthly_revenue}

Return exactly this JSON:
{{
  "contract_title": "<descriptive title>",
  "copyright_holder_share": {copyright_holder_share},
  "creator_share": {creator_share},
  "duration_months": <integer 6-24>,
  "payment_schedule": "monthly",
  "terms": "<2-3 sentences>",
  "dispute_resolution": "<1 sentence>",
  "special_clauses": "<tier-specific clauses or null>",
  "estimated_monthly_revenue_usd": {estimated_monthly_revenue},
  "ip_holder_monthly_cut_usd": <float>,
  "network": "Polygon (Mock)",
  "rationale": "<1 sentence>"
}}"""

_QUOTA_SIGNALS = ("429", "quota", "resource_exhausted", "rate_limit", "too many requests")

def _is_quota(e: Exception) -> bool:
    return any(s in str(e).lower() for s in _QUOTA_SIGNALS)


def _call_llm(prompt: str) -> str:
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
                    logger.warning(f"[Broker] Rate limit — retrying with {model} in {delay}s…")
                    time.sleep(delay)
                resp = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a Web3 revenue broker. Output only valid JSON."},
                        {"role": "user",   "content": prompt},
                    ],
                    temperature=0.2,
                    max_tokens=768,
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

    raise RuntimeError("[Broker] No API keys configured.")


def _calculate_tier(view_count: int) -> str:
    if view_count >= 1_000_000: return "Platinum"
    if view_count >= 100_000:   return "Gold"
    if view_count >= 10_000:    return "Silver"
    return "Bronze"


def _recommend_split(tier: str, risk_score: int) -> tuple[int, int]:
    base = {"Platinum": (20, 80), "Gold": (25, 75), "Silver": (30, 70), "Bronze": (35, 65)}[tier]
    holder, creator = base
    if risk_score > 50:
        adjustment = ((risk_score - 50) // 10) * 2
        holder  = min(holder + adjustment, 49)
        creator = 100 - holder
    return holder, creator


def _estimate_monthly_revenue(view_count: int, platform: str) -> float:
    cpm = PLATFORM_CPM.get(platform, 0.50)
    return round((view_count / 1000) * cpm, 2)


def deploy_contract(
    target_account: str,
    platform: str,
    video_title: str,
    video_url: str = "",
    justification: str = "",
    view_count: int = 0,
    risk_score: int = 30,
) -> dict:
    tier                        = _calculate_tier(view_count)
    holder_share, creator_share = _recommend_split(tier, risk_score)
    estimated_revenue           = _estimate_monthly_revenue(view_count, platform)

    prompt = _CONTRACT_PROMPT.format(
        target_account=target_account,
        platform=platform,
        video_title=video_title,
        view_count=view_count,
        tier=tier,
        copyright_holder_share=holder_share,
        creator_share=creator_share,
        justification=justification or "Fair use content identified.",
        estimated_monthly_revenue=estimated_revenue,
    )

    raw = _call_llm(prompt)

    # Strip markdown fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw)
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    contract_data = json.loads(match.group()) if match else {}

    return {
        "tx_hash":                   "0x" + secrets.token_hex(32),
        "tier":                      tier,
        "copyright_holder_share":    holder_share,
        "creator_share":             creator_share,
        "estimated_monthly_revenue": estimated_revenue,
        "contract_data":             contract_data,
        "network":                   "Polygon (Mock)",
        "target_account":            target_account,
        "platform":                  platform,
    }
