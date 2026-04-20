import os
import time
import random
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM
from crewai.tools import tool

# Load the API key from the .env file
load_dotenv()

print("Waking up The Broker...")

# ==========================================
# 1. INITIALIZE THE LLM BRAIN
# ==========================================
gemini_brain = LLM(
    model="gemini/gemini-2.5-flash",
    temperature=0.2, # Slight flexibility for negotiating/structuring the deal
    api_key=os.getenv("GEMINI_API_KEY")
)

# ==========================================
# 2. THE BROKER'S TOOL (Smart Contract Generator)
# ==========================================
@tool("Deploy Revenue Split Contract")
def tool_deploy_contract(target_account: str, platform: str, copyright_holder_share: int) -> str:
    """Deploys a mock blockchain smart contract to split ad revenue between the creator and the copyright holder."""
    print(f"\n[Broker Tool] Minting Web3 Revenue Split for {target_account} on {platform}...")
    time.sleep(2) # Simulate blockchain minting delay
    
    # Generate a mock transaction hash
    tx_hash = f"0x{random.randbytes(16).hex()}"
    creator_share = 100 - copyright_holder_share
    
    contract_receipt = f"""
    *** SMART CONTRACT DEPLOYED ***
    Network: Polygon (Mock)
    Target Account: {target_account} ({platform})
    Transaction Hash: {tx_hash}
    
    Terms:
    - Original Copyright Holder receives: {copyright_holder_share}% of ad revenue.
    - Transformative Creator ({target_account}) retains: {creator_share}% of ad revenue.
    
    Status: Active. The creator has been notified of the revenue claim. The video remains online.
    """
    return contract_receipt

# ==========================================
# 3. DEFINE THE BROKER AGENT
# ==========================================
broker_agent = Agent(
    role='Web3 Revenue Broker',
    goal='Deploy automated revenue-sharing smart contracts for content classified as Fair Use.',
    backstory="""You are a slick, decentralized finance specialist. When the Adjudicator determines a fan 
    has created a transformative work (Fair Use), you do not issue a takedown. Instead, you secure the bag. 
    You deploy smart contracts to claim a standard 30% revenue share for the original IP owner while letting 
    the fan keep their video online.""",
    verbose=True,
    allow_delegation=False,
    tools=[tool_deploy_contract],
    llm=gemini_brain
)

# ==========================================
# 4. DIRECT EXECUTION TEST 
# ==========================================
if __name__ == "__main__":
    # We simulate the exact "FAIR USE" ruling we got from the Adjudicator earlier
    mock_adjudicator_ruling = """
    CLASSIFICATION: FAIR USE / FAN CONTENT
    JUSTIFICATION: The video exhibits significant transformative elements, including heavy filtering, text overlays, and the addition of phonk music and meme sound effects, which distinguish it from raw, unaltered footage.
    RECOMMENDED ROUTING: Broker
    METADATA: Target is @AnimeFanEdits_99 on TikTok.
    """

    monetization_task = Task(
        description=f"""Review the following legal ruling from the Adjudicator:\n{mock_adjudicator_ruling}\n
        Since the routing is directed to you, you must use your tool to deploy a smart contract. 
        Always enforce a 30% share for the copyright holder.
        Output a final report showing the transaction receipt.""",
        expected_output="A confirmation log showing the blockchain smart contract was successfully minted.",
        agent=broker_agent
    )

    broker_crew = Crew(
        agents=[broker_agent],
        tasks=[monetization_task],
        verbose=True
    )

    print("\n[ALERT] Transformative Content Detected. Handing off to The Broker...\n")
    result = broker_crew.kickoff()
    
    print("\n==============================================")
    print("💰 BROKER ACTION LOG")
    print("==============================================")
    print(result)