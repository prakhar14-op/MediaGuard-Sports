import requests, json, time

NODE = 'http://localhost:8000/api'
YT   = 'https://youtu.be/afiNbSxg7aw?si=VfrX5D31DRz-K-tu'

print('=== SWARM FULL PIPELINE TEST ===')
r = requests.post(f'{NODE}/swarm/run', json={
    'official_video_url': YT,
    'official_title': 'Test Video afiNbSxg7aw'
}, timeout=30)
d = r.json()
print('Launch response:', json.dumps(d, indent=2))

job_id = d.get('jobId')
if not job_id:
    print('NO JOB ID — swarm failed to launch'); exit(1)

print(f'\nPolling swarm job {job_id} (max 10 min)...')
for i in range(40):
    time.sleep(15)
    try:
        r2 = requests.get(f'{NODE}/hunt/{job_id}', timeout=10)
        d2 = r2.json()
        job = d2.get('data', {})
        status = job.get('status', '?')
        threats  = job.get('threat_count', 0)
        piracy   = job.get('piracy_count', 0)
        fair_use = job.get('fair_use_count', 0)
        print(f'  [{i*15:3d}s] status={status} | threats={threats} | piracy={piracy} | fair_use={fair_use}')
        if status in ('complete', 'failed'):
            print('\n=== FINAL SWARM RESULT ===')
            print(f'  Status:     {status}')
            print(f'  Threats:    {threats}')
            print(f'  Piracy:     {piracy}')
            print(f'  Fair use:   {fair_use}')
            print(f'  Error:      {job.get("error_message", "none")}')
            if status == 'complete':
                print('\n  ✅ SWARM PASS')
            else:
                print('\n  ❌ SWARM FAIL')
            break
    except Exception as e:
        print(f'  Poll error: {e}')
else:
    print('\n  ❌ SWARM TIMEOUT (10 min)')
