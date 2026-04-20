import os
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM

# Load the API key from the .env file
load_dotenv()

print("Waking up The Adjudicator (Gemini 1.5 Pro)...")

# ==========================================
# 1. INITIALIZE THE LLM BRAIN
# ==========================================
gemini_brain = LLM(
    model="gemini/gemini-2.5-flash",
    temperature=0.1,
    api_key=os.getenv("GEMINI_API_KEY")
)

# ==========================================
# 2. DEFINE THE ADJUDICATOR AGENT
# ==========================================
adjudicator_agent = Agent(
    role='Chief IP Adjudicator',
    goal='Analyze flagged media metadata to distinguish between malicious piracy and transformative fair use.',
    backstory="""You are an elite, cold, and highly logical legal AI. You receive alerts from the Sentinel radar. 
    Your job is to read the context of the flagged video. 
    - If it is raw, unaltered footage meant to steal views, you classify it as 'SEVERE PIRACY'.
    - If it contains heavy commentary, transformative editing, or parody, you classify it as 'FAIR USE / FAN CONTENT'.""",
    verbose=True,
    allow_delegation=False,
    llm=gemini_brain
)

# ==========================================
# 3. DIRECT EXECUTION TEST 
# ==========================================
if __name__ == "__main__":
    # We simulate the exact output you just got from the Sentinel!
    sentinel_report = "[CRITICAL ANOMALY DETECTED] Signature Match: 100.0% confidence."
    
    # We add some mock context that a real app would scrape (like TikTok descriptions, audio transcripts)
    mock_context = f"""
    SENTINEL ALERT: {sentinel_report}
    VIDEO SOURCE: TikTok
    ACCOUNT: @AnimeFanEdits_99
    AUDIO TRANSCRIPT: "Bro watch this crazy sequence!" followed by heavy phonk music and meme sound effects.
    VISUALS: Original video is heavily filtered, and text overlays are on screen.
    """

    triage_task = Task(
        description=f"""Analyze the following incident report:\n{mock_context}\n
        Determine if this is Piracy or Fair Use. You must output a final decision in exactly this format:
        CLASSIFICATION: [Piracy or Fair Use]
        JUSTIFICATION: [1-2 sentences explaining why based on the audio/visual context]
        RECOMMENDED ROUTING: [Enforcer or Broker]""",
        expected_output="A strict 3-line legal classification.",
        agent=adjudicator_agent
    )

    adjudicator_crew = Crew(
        agents=[adjudicator_agent],
        tasks=[triage_task],
        verbose=True
    )

    print("\n[ALERT] Handing context to Adjudicator...\n")
    result = adjudicator_crew.kickoff()
    
    print("\n==============================================")
    print("⚖️ FINAL ADJUDICATOR VERDICT")
    print("==============================================")
    print(result)