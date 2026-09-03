# Carbon Compass — Environment Setup

## Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEOCODING_API_KEY` | No | (mock) | OpenCage API key for geocoding |
| `SENTINEL_HUB_CLIENT_ID` | No | (mock) | Sentinel Hub OAuth client ID |
| `SENTINEL_HUB_CLIENT_SECRET` | No | (mock) | Sentinel Hub OAuth client secret |
| `QWEN_API_KEY` | No | (mock) | Alibaba Cloud Model Studio API key |
| `ALIBABA_OSS_ACCESS_KEY_ID` | No | (local) | Alibaba Cloud OSS access key |
| `ALIBABA_OSS_ACCESS_KEY_SECRET` | No | (local) | Alibaba Cloud OSS secret |
| `ALIBABA_OSS_BUCKET_NAME` | No | (local) | OSS bucket name |
| `ALIBABA_OSS_ENDPOINT` | No | (local) | OSS endpoint URL |
| `CONFIDENCE_THRESHOLD` | No | 0.5 | Min confidence for valid score |
| `SCORING_WEIGHT_SATELLITE` | No | 0.4 | Satellite weight in scoring |
| `SCORING_WEIGHT_DISCLOSURE` | No | 0.4 | Disclosure weight in scoring |
| `SCORING_WEIGHT_SHIPPING` | No | 0.2 | Shipping weight in scoring |

## Frontend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | http://localhost:8000 | Backend API URL |

## Running

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Mock Mode

When API keys are not configured, the app runs in mock mode:
- Geocoding: returns pre-set coordinates for known locations
- Satellite: generates synthetic imagery
- Qwen: uses deterministic mock analysis
- OSS: stores files locally in `data/`
- Shipping: proximity-based mock proxy
