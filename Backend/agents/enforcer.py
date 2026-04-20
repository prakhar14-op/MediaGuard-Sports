import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import re
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM
from crewai.tools import tool

load_dotenv()

gemini_brain = LLM(
    model="gemini/gemini-2.5-flash",
    temperature=0.1,
    api_key=os.getenv("GEMINI_API_KEY"),
)

# Real legal contact endpoints per platform
PLATFORM_LEGAL_CONTACTS = {
    "YouTube":   "copyright@youtube.com",
    "TikTok":    "legal@tiktok.com",
    "Twitter":   "copyright@twitter.com",
    "Instagram": "ip@instagram.com",
    "Telegram":  "dmca@telegram.org",
    "Reddit":    "copyright@reddit.com",
    "Other":     "legal@platform.com",
}

_DMCA_PROMPT = """
You are a senior IP attorney. Draft a formal DMCA takedown notice using the details below.
The notice must cite 17 U.S.C. § 512(c) and reference the cryptographic FAISS vector proof.
Be precise, professional, and legally binding. Output ONLY the notice text — no preamble.

INCIDENT DETAILS:
- Target Account: {target_account}
- Platform: {platform}
- Legal Contact: {legal_contact}
- Video Title: {video_title}
- Video URL: {video_url}
- Sentinel Confidence: {confidence_score}%
- Adjudicator Classification: {classification}
- Adjudicator Justification: {justification}
- Integrity Hash (FAISS Proof): {integrity_hash}
- Offence Number: {offence_number}

Include:
1. Formal header with To/From/Date/Re fields
2. Statement of authority
3. Description of infringement with specific evidence
4. The cryptographic proof reference
5. Action requested (removal + account strike)
6. If offence_number >= 2, add repeat infringer policy citation (17 U.S.C. § 512(i))
7. If offence_number >= 3, add referral to legal counsel
8. Signature block
"""


@tool("Draft DMCA Notice")
def tool_draft_dmca(
    target_account: str,
    platform: str,
    video_title: str,
    video_url: str,
    confidence_score: str,
    classification: str,
    justification: str,
    integrity_hash: str,
    offence_number: int = 1,
) -> str:
    """Uses Gemini to draft a legally precise DMCA takedown notice tailored to the platform and offence history."""
    legal_contact = PLATFORM_LEGAL_CONTACTS.get(platform, PLATFORM_LEGAL_CONTACTS["Other"])

    prompt = _DMCA_PROMPT.format(
        target_account=target_account,
        platform=platform,
        legal_contact=legal_contact,
        video_title=video_title,
        video_url=video_url,
        confidence_score=confidence_score,
        classification=classification,
        justification=justification,
        integrity_hash=integrity_hash,
        offence_number=offence_number,
    )

    task = Task(
        description=prompt,
        expected_output="A complete, formal DMCA takedown notice ready to send.",
        agent=enforcer_agent,
    )
    crew   = Crew(agents=[enforcer_agent], tasks=[task], verbose=False)
    result = crew.kickoff()
    return str(result)


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

    notice_text = tool_draft_dmca.func(
        target_account=target_account,
        platform=platform,
        video_title=video_title,
        video_url=video_url,
        confidence_score=str(confidence_score),
        classification=classification,
        justification=justification,
        integrity_hash=integrity_hash,
        offence_number=offence_number,
    )

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


enforcer_agent = Agent(
    role="Lead Legal Executor",
    goal="Draft legally precise DMCA takedown notices and escalate based on repeat infringer history.",
    backstory=(
        "You are a relentless digital lawyer. When the Adjudicator rules SEVERE PIRACY, "
        "you draft airtight 17 U.S.C. § 512(c) notices. Repeat offenders get escalated to "
        "expedited takedowns and legal referrals. You never hesitate."
    ),
    verbose=True,
    allow_delegation=False,
    tools=[tool_draft_dmca],
    llm=gemini_brain,
)
