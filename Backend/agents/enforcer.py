import os
import time
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM
from crewai.tools import tool

# Load the API key from the .env file
load_dotenv()

print("Waking up The Enforcer...")

# ==========================================
# 1. INITIALIZE THE LLM BRAIN
# ==========================================
# We use the exact same highly-logical brain as the Adjudicator
gemini_brain = LLM(
    model="gemini/gemini-2.5-flash",
    temperature=0.1, # Keep it low. Legal documents cannot have hallucinations.
    api_key=os.getenv("GEMINI_API_KEY")
)

# ==========================================
# 2. THE ENFORCER'S TOOL (DMCA Generator)
# ==========================================
@tool("Issue DMCA Takedown")
def tool_issue_dmca(target_account: str, platform: str, confidence_score: str) -> str:
    """Generates an official DMCA takedown notice and simulates sending it to the platform's legal department."""
    print(f"\n[Enforcer Tool] Drafting legal takedown for {target_account} on {platform}...")
    time.sleep(2) # Simulate API delay
    
    # In a full production app, this would use the SendGrid or AWS SES API to email copyright@platform.com
    notice = f"""
    *** OFFICIAL DMCA TAKEDOWN NOTICE ***
    To: legal@{platform.lower()}.com
    Target Account: {target_account}
    Infringement Confidence: {confidence_score}
    
    Pursuant to 17 U.S.C. 512(c), this constitutes notification that the account listed above is unlawfully 
    distributing copyrighted intellectual property. We have cryptographic FAISS vector proof of this infringement.
    
    Action Requested: Immediate removal of the infringing content and a strike against the user's account.
    *** STATUS: SENT TO {platform.upper()} LEGAL API ***
    """
    return notice

# ==========================================
# 3. DEFINE THE ENFORCER AGENT
# ==========================================
enforcer_agent = Agent(
    role='Lead Legal Executor',
    goal='Execute immediate DMCA takedown procedures against verified malicious actors.',
    backstory="""You are a relentless digital lawyer. When the Adjudicator rules a case as 'SEVERE PIRACY', 
    you do not hesitate. You gather the metadata and instantly draft and deploy legal takedown notices to 
    ensure stolen intellectual property is removed from the internet.""",
    verbose=True,
    allow_delegation=False,
    tools=[tool_issue_dmca],
    llm=gemini_brain
)

# ==========================================
# 4. DIRECT EXECUTION TEST 
# ==========================================
if __name__ == "__main__":
    # We simulate a "SEVERE PIRACY" ruling coming from the Adjudicator
    mock_adjudicator_ruling = """
    CLASSIFICATION: SEVERE PIRACY
    JUSTIFICATION: The video is a raw, 1:1 copy of the protected broadcast with no transformative commentary, editing, or parody. The user is attempting to pass the content off as their own to farm views.
    RECOMMENDED ROUTING: Enforcer
    METADATA: Target is @PirateKing_007 on Twitter/X. Sentinel Confidence: 99.8%.
    """

    execution_task = Task(
        description=f"""Review the following legal ruling from the Adjudicator:\n{mock_adjudicator_ruling}\n
        Since the routing is directed to you, you must use your tool to issue a formal DMCA takedown against the target.
        Output a final report confirming the takedown has been sent.""",
        expected_output="A confirmation log showing the DMCA notice was successfully generated and transmitted.",
        agent=enforcer_agent
    )

    enforcer_crew = Crew(
        agents=[enforcer_agent],
        tasks=[execution_task],
        verbose=True
    )

    print("\n[ALERT] Severe Piracy Detected. Handing off to The Enforcer...\n")
    result = enforcer_crew.kickoff()
    
    print("\n==============================================")
    print("⚖️ ENFORCER ACTION LOG")
    print("==============================================")
    print(result)