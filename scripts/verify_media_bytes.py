import requests
import base64
import time
import os

API = 'http://127.0.0.1:8001/api'

# 1. Authenticate
DEMO = {"email": "demo@omniverse.io", "password": "omniverse123"}
r = requests.post(f'{API}/auth/login', json=DEMO, timeout=30)
if r.status_code != 200:
    requests.post(f'{API}/auth/signup', json={"email": DEMO["email"], "password": DEMO["password"], "name": "Demo User"}, timeout=30)
    r = requests.post(f'{API}/auth/login', json=DEMO, timeout=30)
token = r.json().get('token')
headers = {'Authorization': f'Bearer {token}'}

print('[AUTH] Token acquired.')

# 2. Test Image Generation
print('\n[IMAGE] Testing asynchronous image generation (/api/ai/image/generate)...')
r_img = requests.post(f'{API}/ai/image/generate', json={
    'prompt': 'a high tech futuristic glowing quantum orb on dark background',
    'width': 512,
    'height': 512
}, headers=headers)

print('Enqueue response:', r_img.status_code, r_img.json())
job_id = r_img.json().get('generation_id')

image_success = False
if job_id:
    for i in range(25):
        time.sleep(1)
        st = requests.get(f'{API}/ai/image/generation/{job_id}', headers=headers).json()
        print(f"Poll {i+1}: status={st.get('status')}, progress={st.get('progress')}, provider={st.get('provider')}")
        if st.get('status') == 'completed':
            b64 = st.get('image_b64', '')
            raw_bytes = base64.b64decode(b64)
            print(f"SUCCESS: Decoded {len(raw_bytes)} bytes of image data.")
            # Verify PNG magic bytes
            is_png = raw_bytes.startswith(b'\x89PNG\r\n\x1a\n')
            is_jpeg = raw_bytes.startswith(b'\xff\xd8\xff')
            print(f"Magic header check: is_png={is_png}, is_jpeg={is_jpeg}")
            os.makedirs('artifacts/certification/media_evidence', exist_ok=True)
            with open('artifacts/certification/media_evidence/actual_generated_image.png', 'wb') as f:
                f.write(raw_bytes)
            print("Saved image to artifacts/certification/media_evidence/actual_generated_image.png")
            image_success = True
            break
        elif st.get('status') == 'failed':
            print(f"FAILED: Image generation job failed with error: {st.get('error')}")
            break

# 3. Test TTS Voice Generation
print('\n[VOICE] Testing voice synthesis...')
# Check what endpoints exist
# Check /api/ai/tts-kokoro/status
r_kokoro_st = requests.get(f'{API}/ai/tts-kokoro/status', headers=headers)
print('Kokoro status:', r_kokoro_st.status_code, r_kokoro_st.text)

# Try /api/ai/tts-kokoro
r_kokoro = requests.post(f'{API}/ai/tts-kokoro', json={
    'text': 'OmniverseOS autonomous speech synthesis operational check.',
    'voice': 'af_heart',
    'speed': 1.0
}, headers=headers)
print('Kokoro POST response:', r_kokoro.status_code, len(r_kokoro.content), 'bytes')

# Try /api/ai/tts-gemini
r_gemini_tts = requests.post(f'{API}/ai/tts-gemini', json={
    'text': 'OmniverseOS speech verification.',
    'voice': 'Kore'
}, headers=headers)
print('Gemini TTS response:', r_gemini_tts.status_code, r_gemini_tts.text[:200])

# Try /api/ai/tts-fish
r_fish_tts = requests.post(f'{API}/ai/tts-fish', json={
    'text': 'OmniverseOS speech verification.'
}, headers=headers)
print('Fish TTS response:', r_fish_tts.status_code, r_fish_tts.text[:200])
