import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import re
import secrets
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM
from crewai.tools import tool

load_dotenv()

gemini_brain = LLM(
    model="gemini/gemini-2.5-flash",
    temperature=0.2,
    api_key=os.getenv("GEMINI_API_KEY"),
)

# Platform CPM rates (USD per 1000 views) — used for revenue projection
PLATFORM_CPM = {
    "YouTube":   4.50,
    "TikTok":    0.02,
    "Twitter":   0.50,
    "Instagram": 1.20,
    "Telegram":  0.10,
    "Reddit":    0.30,
    "Other":     0.50,
}

_CONTRACT_PROMPT = """
You are a Web3 revenue broker and IP licensing specialist. Draft a smart contract licensing agreement
for the following Fair Use content. Output ONLY a JSON object — no markdown, no prose outside the JSON.

DEAL CONTEXT:
- Creator Account: {target_account}
- Platform: {platform}
- Video Title: {video_title}
- View Count: {view_count}
- Engagement Tier: {tier}
- Recommended Copyright Holder Share: {copyright_holder_share}%
- Creator Share: {creator_share}%
- Adjudicator Justification: {justification}
- Estimated Monthly Revenue: ${estimated_monthly_revenue}

Return exactly this JSON structure:
{{
  "contract_title": "<descriptive title>",
  "copyright_holder_share": {copyright_holder_share},
  "creator_share": {creator_share},
  "duration_months": <integer, 6-24 based on tier>,
  "payment_schedule": "monthly" or "quarterly",
  "terms": "<2-3 sentences of specific contract terms>",
  "dispute_resolution": "<1 sentence>",
  "special_clauses": "<any tier-specific clauses, or null>",
  "estimated_monthly_revenue_usd": {estimated_monthly_revenue},
  "ip_holder_monthly_cut_usd": <float, copyright_holder_share% of estimated_monthly_revenue>,
  "network": "Polygon (Mock)",
  "rationale": "<1 sentence explaining the split decision>"
}}
"""


def _calculate_tier(view_count: int) -> str:
    if view_count >= 1_000_000: return "Platinum"
    if view_count >= 100_000:   return "Gold"
    if view_count >= 10_000:    return "Silver"
    return "Bronze"


def _recommend_split(tier: str, risk_score: int) -> tuple[int, int]:
    """
    Dynamic split based on virality tier and Adjudicator risk score.
    Higher virality = better deal for creator (more incentive to cooperate).
    Higher risk score = larger cut for IP holder.
    """
    base = {
        "Platinum": (20, 80),
        "Gold":     (25, 75),
        "Silver":   (30, 70),
        "Bronze":   (35, 65),
    }[tier]

    holder, creator = base
    # Risk score adjustment: every 10 points above 50 adds 2% to holder share
    if risk_score > 50:
        adjustment = ((risk_score - 50) // 10) * 2
        holder  = min(holder + adjustment, 49)
        creator = 100 - holder

    return holder, creator


def _estimate_monthly_revenue(view_count: int, platform: str) -> float:
    cpm = PLATFORM_CPM.get(platform, 0.50)
    return round((view_count / 1000) * cpm, 2)


@tool("Deploy Revenue Split Contract")
def tool_deploy_contract(
    target_account: str,
    platform: str,
    video_title: str,
    copyright_holder_share: int,
    creator_share: int,
    tier: str,
    justification: str,
    view_count: int = 0,
    risk_score: int = 30,
) -> str:
    """Deploys a Gemini-drafted smart contract with dynamic rev-share terms to the mock Polygon network."""
    estimated_revenue = _estimate_monthly_revenue(view_count, platform)

    prompt = _CONTRACT_PROMPT.format(
        target_account=target_account,
        platform=platform,
        video_title=video_title,
        view_count=view_count,
        tier=tier,
        copyright_holder_share=copyright_holder_share,
        creator_share=creator_share,
        justification=justification,
        estimated_monthly_revenue=estimated_revenue,
    )

    task = Task(
        description=prompt,
        expected_output="A strict JSON smart contract object.",
        agent=broker_agent,
    )
    crew   = Crew(agents=[broker_agent], tasks=[task], verbose=False)
    result = crew.kickoff()
    return str(result)


def deploy_contract(
    target_account: str,
    platform: str,
    video_title: str,
    video_url: str = "",
    justification: str = "",
    view_count: int = 0,
    risk_score: int = 30,
) -> dict:
    tier                    = _calculate_tier(view_count)
    holder_share, creator_share = _recommend_split(tier, risk_score)
    estimated_revenue       = _estimate_monthly_revenue(view_count, platform)

    raw = tool_deploy_contract.func(
        target_account=target_account,
        platform=platform,
        video_title=video_title,
        copyright_holder_share=holder_share,
        creator_share=creator_share,
        tier=tier,
        justification=justification,
        view_count=view_count,
        risk_score=risk_score,
    )

    # Parse JSON from Gemini output
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    contract_data = json.loads(match.group()) if match else {}

    tx_hash = "0x" + secrets.token_hex(32)

    return {
        "tx_hash":                  tx_hash,
        "tier":                     tier,
        "copyright_holder_share":   holder_share,
        "creator_share":            creator_share,
        "estimated_monthly_revenue": estimated_revenue,
        "contract_data":            contract_data,
        "network":                  "Polygon (Mock)",
        "target_account":           target_account,
        "platform":                 platform,
    }


broker_agent = Agent(
    role="Web3 Revenue Broker",
    goal="Deploy dynamic revenue-sharing smart contracts that turn Fair Use fan content into monetized IP deals.",
    backstory=(
        "You are a slick decentralized finance specialist. When the Adjudicator flags Fair Use, "
        "you don't delete — you monetize. You analyze virality, calculate optimal rev-splits, "
        "and mint smart contracts that make everyone money. Platinum creators get better deals. "
        "Repeat viral creators get long-term licensing. You always secure the bag."
    ),
    verbose=True,
    allow_delegation=False,
    tools=[tool_deploy_contract],
    llm=gemini_brain,
)
