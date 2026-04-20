import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import re
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM

load_dotenv()

gemini_brain = LLM(
    model="gemini/gemini-2.5-flash",
    temperature=0.1,
    api_key=os.getenv("GEMINI_API_KEY"),
)

adjudicator_agent = Agent(
    role="Chief IP Adjudicator",
    goal="Analyze flagged media metadata and classify it as SEVERE PIRACY or FAIR USE with a numeric risk score.",
    backstory=(
        "You are an elite, cold, and highly logical legal AI trained on IP law. "
        "You receive Sentinel alerts and analyze the context of flagged videos. "
        "Raw unaltered footage = SEVERE PIRACY. "
        "Heavy commentary, transformative editing, parody, or reaction content = FAIR USE / FAN CONTENT. "
        "You always output strict JSON. No prose. No markdown."
    ),
    verbose=True,
    allow_delegation=False,
    llm=gemini_brain,
)

_VERDICT_PROMPT = """
Analyze this IP infringement incident and return ONLY a JSON object with no markdown, no explanation outside the JSON.

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
  "legal_basis": "<brief legal principle, e.g. 17 U.S.C. 107 fair use factors>",
  "recommended_action": "<one concrete action>"
}}
"""


def _parse_verdict(raw: str) -> dict:
    """Extract JSON from Gemini output even if it wraps it in markdown."""
    raw = raw.strip()
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON found in Adjudicator output: {raw[:200]}")
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
        description=description or "Not provided",
        country=country or "Unknown",
        confidence_score=confidence_score,
        low_confidence=low_confidence,
    )

    task = Task(
        description=prompt,
        expected_output="A strict JSON object with classification, risk_score, justification, routing, legal_basis, recommended_action.",
        agent=adjudicator_agent,
    )

    crew   = Crew(agents=[adjudicator_agent], tasks=[task], verbose=False)
    result = crew.kickoff()

    raw_text = str(result)
    verdict  = _parse_verdict(raw_text)

    # Enforce low-confidence leniency — downgrade DMCA to review if Sentinel wasn't sure
    if low_confidence and verdict.get("routing") == "Enforcer":
        verdict["routing"]            = "Broker"
        verdict["recommended_action"] = "Flag for human review before issuing DMCA (low Sentinel confidence)"

    return verdict


def batch_adjudicate(incidents: list) -> list:
    """Adjudicate multiple incidents. Each item must have the same keys as adjudicate()."""
    results = []
    for inc in incidents:
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
            results.append({"incident_id": inc.get("incident_id"), "verdict": None, "error": str(e)})
    return results
