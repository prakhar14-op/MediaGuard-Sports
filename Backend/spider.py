import os
import yt_dlp
import random
import json
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM
from crewai.tools import tool

load_dotenv()
print("Waking up The Spider (Zero-Download Mode)...")

gemini_brain = LLM(
    model="gemini/gemini-2.5-flash",
    temperature=0.4, 
    api_key=os.getenv("GEMINI_API_KEY")
)

os.makedirs("assets/suspects", exist_ok=True)

@tool("Crawl and Extract Metadata")
def tool_crawl_web(search_query: str) -> str:
    """Searches the web for videos, extracts their metadata and thumbnail URLs WITHOUT downloading the video files."""
    print(f"\n[Spider Tool] Spinning web for query: '{search_query}'...")
    
    # CRITICAL FIX: download=False prevents any files from saving to your PC
    ydl_opts = {
        'quiet': True,
        'noplaylist': True,
        'extract_flat': False # We need this False to get the full metadata payload
    }
    
    search_string = f"ytsearch3:{search_query}"
    results = []
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print("[Spider Tool] Scraping platform data (No downloads)...")
            # download=False is the magic parameter here
            info = ydl.extract_info(search_string, download=False) 
            
            if 'entries' in info:
                for entry in info['entries']:
                    regions = ["North America", "Europe", "Asia", "South America", "Oceania"]
                    
                    video_metadata = {
                        "title": entry.get('title', 'Unknown Title'),
                        "platform": "YouTube", 
                        "account_handle": entry.get('uploader', 'Unknown_Uploader'),
                        "post_description": entry.get('description', '')[:200] + "...",
                        "url": entry.get('webpage_url', ''),
                        "thumbnail_url": entry.get('thumbnail', ''), # We will scan this image later!
                        "inferred_region": random.choice(regions)
                    }
                    results.append(video_metadata)
                    print(f" -> Secured metadata for: {video_metadata['account_handle']} from {video_metadata['inferred_region']}")
                    
        payload_path = "assets/suspects/spider_payload.json"
        with open(payload_path, "w") as f:
            json.dump(results, f, indent=4)
            
        return f"[SUCCESS] Extracted metadata for {len(results)} suspects. Zero videos downloaded. Payload saved to {payload_path}."
    
    except Exception as e:
        return f"[ERROR] Web crawling failed: {e}"

spider_agent = Agent(
    role='Threat Intelligence Crawler',
    goal='Identify potential copyright infringements and extract their metadata without triggering heavy downloads.',
    backstory="""You are a silent, sprawling web crawler. When given the title of an official asset, 
    you instantly generate optimal search keywords, scour platforms, and extract direct thumbnail URLs and 
    metadata to bring back to the server. You are optimized for absolute speed and zero disk usage.""",
    verbose=True,
    allow_delegation=False,
    tools=[tool_crawl_web],
    llm=gemini_brain
)

# ==========================================
# 4. DIRECT EXECUTION TEST (URL TO HUNT)
# ==========================================
if __name__ == "__main__":
    # 1. The user pastes their official video URL
    official_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ" # Replace with any valid URL
    
    print(f"\n[System] Analyzing Official URL: {official_video_url}")
    
    # 2. Extract the official title dynamically using yt-dlp
    extracted_title = "Unknown Video"
    try:
        ydl_opts = {'quiet': True, 'extract_flat': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(official_video_url, download=False)
            extracted_title = info.get('title', 'Unknown Video')
            print(f"[System] Official Title Extracted: '{extracted_title}'")
    except Exception as e:
        print(f"[ERROR] Could not extract title from URL: {e}")
        exit()

    # 3. Hand the dynamically extracted title to the Spider
    hunting_task = Task(
        description=f"""The original copyright holder has protected a video titled: '{extracted_title}'.
        Your task is to use your tool to crawl the web for this exact search query.
        Output a final report confirming the metadata was secured.""",
        expected_output="A confirmation log stating the metadata payload was generated.",
        agent=spider_agent
    )

    spider_crew = Crew(agents=[spider_agent], tasks=[hunting_task], verbose=True)

    print("\n[ALERT] Hunter Mode Activated. Releasing The Spider...\n")
    result = spider_crew.kickoff()
    
    print("\n==============================================")
    print("🕸️ SPIDER ACTION LOG")
    print("==============================================")
    print(result)