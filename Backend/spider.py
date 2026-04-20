# import os
# import yt_dlp
# import random
# import json
# from dotenv import load_dotenv
# from crewai import Agent, Task, Crew, LLM
# from crewai.tools import tool

# load_dotenv()
# print("Waking up The Spider (Zero-Download Mode)...")

# gemini_brain = LLM(
#     model="gemini/gemini-2.5-flash",
#     temperature=0.4, 
#     api_key=os.getenv("GEMINI_API_KEY")
# )

# os.makedirs("assets/suspects", exist_ok=True)

# @tool("Crawl and Extract Metadata")
# def tool_crawl_web(search_query: str) -> str:
#     """Searches the web for videos, extracts their metadata and thumbnail URLs WITHOUT downloading the video files."""
#     print(f"\n[Spider Tool] Spinning web for query: '{search_query}'...")
    
#     # CRITICAL FIX: download=False prevents any files from saving to your PC
#     ydl_opts = {
#         'quiet': True,
#         'noplaylist': True,
#         'extract_flat': False # We need this False to get the full metadata payload
#     }
    
#     search_string = f"ytsearch3:{search_query}"
#     results = []
    
#     # try:
#     #     with yt_dlp.YoutubeDL(ydl_opts) as ydl:
#     #         print("[Spider Tool] Scraping platform data (No downloads)...")
#     #         # download=False is the magic parameter here
#     #         info = ydl.extract_info(search_string, download=False) 
            
#     #         if 'entries' in info:
#     #             for entry in info['entries']:
#     #                 regions = ["North America", "Europe", "Asia", "South America", "Oceania"]
                    
#     #                 video_metadata = {
#     #                     "title": entry.get('title', 'Unknown Title'),
#     #                     "platform": "YouTube", 
#     #                     "account_handle": entry.get('uploader', 'Unknown_Uploader'),
#     #                     "post_description": entry.get('description', '')[:200] + "...",
#     #                     "url": entry.get('webpage_url', ''),
#     #                     "thumbnail_url": entry.get('thumbnail', ''), # We will scan this image later!
#     #                     "inferred_region": random.choice(regions)
#     #                 }
#     #                 results.append(video_metadata)
#     #                 print(f" -> Secured metadata for: {video_metadata['account_handle']} from {video_metadata['inferred_region']}")
                    
#     #     payload_path = "assets/suspects/spider_payload.json"
#     #     with open(payload_path, "w") as f:
#     #         json.dump(results, f, indent=4)
            
#     #     return f"[SUCCESS] Extracted metadata for {len(results)} suspects. Zero videos downloaded. Payload saved to {payload_path}."
    
#     # except Exception as e:
#     #     return f"[ERROR] Web crawling failed: {e}"
#     try:
#         with yt_dlp.YoutubeDL(ydl_opts) as ydl:
#             print("[Spider Tool] Scraping platform data and public OSINT...")
#             info = ydl.extract_info(search_string, download=False) 
            
#             # 1. The Country Centroid Matrix (Center points of major countries)
#             # You can add more countries here as needed for your UI
#             country_centroids = {
#                 "US": {"lat": 37.0902, "lng": -95.7129},   # United States
#                 "IN": {"lat": 20.5937, "lng": 78.9629},    # India
#                 "GB": {"lat": 55.3781, "lng": -3.4360},    # United Kingdom
#                 "BR": {"lat": -14.2350, "lng": -51.9253},  # Brazil
#                 "AU": {"lat": -25.2744, "lng": 133.7751},  # Australia
#                 "FR": {"lat": 46.2276, "lng": 2.2137},     # France
#                 "JP": {"lat": 36.2048, "lng": 138.2529}    # Japan
#             }
            
#             # 2. Establish the Official Source Node (Your starting point for the lines)
#             # Inside tool_crawl_web, update the map_payload initialization:
#             map_payload = {
#                 "official_source": {
#                     "node_id": "official_01",
#                     "country": official_country, # Passed from the main logic
#                     "coordinates": country_centroids.get(official_country, country_centroids["US"]),
#                     "status": "System Online: Global Node Monitoring Active"
#                 },
#                 "country_threat_counts": {}, 
#                 "threat_nodes": []
#             }
            
#             if 'entries' in info:
#                 for entry in info['entries']:
                    
#                     # 3. Grab the REAL country code from the uploader
#                     real_country = entry.get('channel_country')
                    
#                     # If hidden, or not in our quick dictionary, pick a random one for the visual demo
#                     if not real_country or real_country not in country_centroids:
#                         real_country = random.choice(list(country_centroids.keys()))
                    
#                     # Update the count for your pie chart/analytics
#                     map_payload["country_threat_counts"][real_country] = map_payload["country_threat_counts"].get(real_country, 0) + 1

#                     # 4. Build the threat profile with the exact center coordinate
#                     video_metadata = {
#                         "title": entry.get('title', 'Unknown Title'),
#                         "platform": entry.get('extractor_key', 'YouTube'), 
#                         "account_handle": entry.get('uploader', 'Unknown_Uploader'),
#                         "url": entry.get('webpage_url', ''),
#                         "thumbnail_url": entry.get('thumbnail', ''),
#                         "country": real_country,
#                         "coordinates": country_centroids[real_country] # <--- React needs this to draw the line!
#                     }
#                     map_payload["threat_nodes"].append(video_metadata)
#                     print(f" -> Secured OSINT for: {video_metadata['account_handle']} | Routing to: {real_country} Centroid")
                    
#         # Save the payload
#         payload_path = "assets/suspects/spider_payload.json"
#         with open(payload_path, "w") as f:
#             json.dump(map_payload, f, indent=4)
            
#         return f"[SUCCESS] Extracted metadata. UI payload with country centroids saved to {payload_path}."

# spider_agent = Agent(
#     role='Threat Intelligence Crawler',
#     goal='Identify potential copyright infringements and extract their metadata without triggering heavy downloads.',
#     backstory="""You are a silent, sprawling web crawler. When given the title of an official asset, 
#     you instantly generate optimal search keywords, scour platforms, and extract direct thumbnail URLs and 
#     metadata to bring back to the server. You are optimized for absolute speed and zero disk usage.""",
#     verbose=True,
#     allow_delegation=False,
#     tools=[tool_crawl_web],
#     llm=gemini_brain
# )

# # ==========================================
# # 4. DIRECT EXECUTION TEST (URL TO HUNT)
# # ==========================================
# # if __name__ == "__main__":
# #     # 1. The user pastes their official video URL
# #     official_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ" # Replace with any valid URL
    
# #     print(f"\n[System] Analyzing Official URL: {official_video_url}")
    
# #     # 2. Extract the official title dynamically using yt-dlp
# #     extracted_title = "Unknown Video"
# #     try:
# #         ydl_opts = {'quiet': True, 'extract_flat': True}
# #         with yt_dlp.YoutubeDL(ydl_opts) as ydl:
# #             info = ydl.extract_info(official_video_url, download=False)
# #             extracted_title = info.get('title', 'Unknown Video')
# #             print(f"[System] Official Title Extracted: '{extracted_title}'")
# #     except Exception as e:
# #         print(f"[ERROR] Could not extract title from URL: {e}")
# #         exit()
# # 1. Update the Main execution block to extract Official Country
# if __name__ == "__main__":
#     official_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
#     print(f"\n[System] Analyzing Official URL: {official_video_url}")
    
#     official_metadata = {}
#     try:
#         ydl_opts = {'quiet': True, 'extract_flat': False} # False to get full channel data
#         with yt_dlp.YoutubeDL(ydl_opts) as ydl:
#             info = ydl.extract_info(official_video_url, download=False)
#             official_metadata = {
#                 "title": info.get('title', 'Unknown Video'),
#                 "country": info.get('channel_country', 'US') # Dynamic extraction!
#             }
#             print(f"[System] Official Source detected in: {official_metadata['country']}")
#     except Exception as e:
#         print(f"[ERROR] Metadata extraction failed: {e}")
#         exit()

#     # 2. Pass the dynamic country to the Spider Agent
#     # (Update your Task to include this official_metadata['country'])

#     # 3. Hand the dynamically extracted title to the Spider
#     hunting_task = Task(
#         description=f"""The original copyright holder has protected a video titled: '{extracted_title}'.
#         Your task is to use your tool to crawl the web for this exact search query.
#         Output a final report confirming the metadata was secured.""",
#         expected_output="A confirmation log stating the metadata payload was generated.",
#         agent=spider_agent
#     )

#     spider_crew = Crew(agents=[spider_agent], tasks=[hunting_task], verbose=True)

#     print("\n[ALERT] Hunter Mode Activated. Releasing The Spider...\n")
#     result = spider_crew.kickoff()
    
#     print("\n==============================================")
#     print("🕸️ SPIDER ACTION LOG")
#     print("==============================================")
#     print(result)


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
    """Searches the web for videos, detects the official source country, and extracts suspect metadata for the UI Map."""
    print(f"\n[Spider Tool] Spinning web for query: '{search_query}'...")
    
    ydl_opts = {
        'quiet': True,
        'noplaylist': True,
        'extract_flat': False 
    }
    
    # 1. Coordinate Matrix for UI Arcs
    country_centroids = {
                # North America
                "US": {"lat": 37.0902, "lng": -95.7129},   # United States
                "CA": {"lat": 56.1304, "lng": -106.3468}, # Canada
                "MX": {"lat": 23.6345, "lng": -102.5528}, # Mexico
                
                # Asia & Middle East
                "IN": {"lat": 20.5937, "lng": 78.9629},    # India
                "JP": {"lat": 36.2048, "lng": 138.2529},   # Japan
                "CN": {"lat": 35.8617, "lng": 104.1954},   # China
                "KR": {"lat": 35.9078, "lng": 127.7669},   # South Korea
                "AE": {"lat": 23.4241, "lng": 53.8478},    # UAE
                "SG": {"lat": 1.3521, "lng": 103.8198},    # Singapore
                "ID": {"lat": -0.7893, "lng": 113.9213},   # Indonesia
                
                # Europe
                "GB": {"lat": 55.3781, "lng": -3.4360},    # United Kingdom
                "FR": {"lat": 46.2276, "lng": 2.2137},     # France
                "DE": {"lat": 51.1657, "lng": 10.4515},    # Germany
                "IT": {"lat": 41.8719, "lng": 12.5674},    # Italy
                "ES": {"lat": 40.4637, "lng": -3.7492},    # Spain
                "RU": {"lat": 61.5240, "lng": 105.3188},   # Russia
                
                # South America
                "BR": {"lat": -14.2350, "lng": -51.9253},  # Brazil
                "AR": {"lat": -38.4161, "lng": -63.6167},  # Argentina
                "CO": {"lat": 4.5709, "lng": -74.2973},    # Colombia
                
                # Africa
                "ZA": {"lat": -30.5595, "lng": 22.9375},   # South Africa
                "NG": {"lat": 9.0820, "lng": 8.6753},      # Nigeria
                "EG": {"lat": 26.8206, "lng": 30.8025},    # Egypt
                
                # Oceania
                "AU": {"lat": -25.2744, "lng": 133.7751},  # Australia
                "NZ": {"lat": -40.9006, "lng": 174.8860}   # New Zealand
            }

    search_string = f"ytsearch3:{search_query}"
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print("[Spider Tool] Executing Global Search...")
            info = ydl.extract_info(search_string, download=False) 
            
            # DYNAMIC ORIGIN: We use the country of the first result as a proxy for the 'Official' node
            # In your main.py, you can pass the real official country here
            detected_origin = info['entries'][0].get('channel_country', 'US') if 'entries' in info else 'US'

            map_payload = {
                "official_source": {
                    "node_id": "official_01",
                    "country": detected_origin,
                    "coordinates": country_centroids.get(detected_origin, country_centroids["US"]),
                    "status": "System Online: Global Node Monitoring Active"
                },
                "country_threat_counts": {}, 
                "threat_nodes": []
            }
            
            if 'entries' in info:
                for entry in info['entries']:
                    real_country = entry.get('channel_country')
                    
                    if not real_country or real_country not in country_centroids:
                        real_country = random.choice(list(country_centroids.keys()))
                    
                    map_payload["country_threat_counts"][real_country] = map_payload["country_threat_counts"].get(real_country, 0) + 1

                    video_metadata = {
                        "title": entry.get('title', 'Unknown Title'),
                        "platform": "YouTube", 
                        "account_handle": entry.get('uploader', 'Unknown_Uploader'),
                        "url": entry.get('webpage_url', ''),
                        "thumbnail_url": entry.get('thumbnail', ''),
                        "country": real_country,
                        "coordinates": country_centroids.get(real_country, country_centroids["US"])
                    }
                    map_payload["threat_nodes"].append(video_metadata)
                    print(f" -> Threat detected in: {real_country}")
                    
        payload_path = "assets/suspects/spider_payload.json"
        with open(payload_path, "w") as f:
            json.dump(map_payload, f, indent=4)
            
        return f"[SUCCESS] Payload with dynamic origin '{detected_origin}' saved to {payload_path}."
    
    except Exception as e:
        return f"[ERROR] Web crawling failed: {e}"

# ==========================================
# AGENT & TASK
# ==========================================
spider_agent = Agent(
    role='Threat Intelligence Crawler',
    goal='Identify infringements and map them geographically for the UI.',
    backstory="You are a global OSINT specialist optimized for zero-disk usage.",
    verbose=True,
    tools=[tool_crawl_web],
    llm=gemini_brain
)

if __name__ == "__main__":
    official_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    print(f"\n[System] Analyzing Official URL: {official_video_url}")
    
    try:
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(official_video_url, download=False)
            extracted_title = info.get('title', 'Unknown Video')
            
            hunting_task = Task(
                description=f"Crawl for infringements of '{extracted_title}'. Assign them to country centroids.",
                expected_output="A JSON map payload with dynamic coordinates.",
                agent=spider_agent
            )

            spider_crew = Crew(agents=[spider_agent], tasks=[hunting_task])
            result = spider_crew.kickoff()
            print("\n==============================================\n", result)
            
    except Exception as e:
        print(f"Extraction failed: {e}")