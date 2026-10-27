import httpx
import time
import base64

def main():
    base = 'https://omniverseos-testing-23jun2am.onrender.com'
    res = httpx.post(
        f'{base}/api/auth/login',
        json={'email': 'demo@omniverse.io', 'password': 'omniverse123'},
        headers={'Origin': 'https://omniverseos.in.net'}
    )
    token = res.json()['token']
    headers = {'Authorization': f'Bearer {token}', 'Origin': 'https://omniverseos.in.net'}

    gen_id = 'e8b0db7d-871f-4c5b-9f58-d7b2e20eb3eb'
    print(f"Polling generation job: {gen_id}")
    for i in range(15):
        time.sleep(2)
        poll = httpx.get(f'{base}/api/ai/image/generation/{gen_id}', headers=headers, timeout=15.0)
        data = poll.json()
        status = data.get('status')
        provider = data.get('provider')
        print(f"Poll #{i+1}: status = {status}, provider = {provider}")
        if status == 'completed':
            b64_img = data.get('image_base64')
            raw_bytes = base64.b64decode(b64_img) if b64_img else b''
            print(f"SUCCESS! Provider: {provider}, Bytes: {len(raw_bytes)}")
            filepath = 'artifacts/certification/media_evidence/render_production_generated_image.png'
            with open(filepath, 'wb') as f:
                f.write(raw_bytes)
            print(f"Saved {len(raw_bytes)} bytes to {filepath}")
            # Verify magic bytes
            header = raw_bytes[:4].hex()
            print(f"Image Header Hex: {header}")
            return
        elif status == 'failed':
            print("FAILED:", data.get('error'))
            return

if __name__ == '__main__':
    main()
