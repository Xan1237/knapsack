# Knapsack mobile

Knapsack rebuilt as an MVP mobile app: an **Expo Go** frontend (`frontend/`) and a **Python FastAPI** backend (`backend/`). No accounts or login yet. A trip is saved on the phone; the backend keeps no data.

## Run it

You need **Node 22.13 or newer** (Expo SDK 58's React Native requires it), **Python 3.10 or newer**, and the current **Expo Go** app on your phone. The phone and computer must be on the same Wi-Fi.

**1. Backend** (Windows PowerShell; on macOS/Linux use `python3` and `source .venv/bin/activate`):

```powershell
cd mobile\backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # then set OPENAI_API_KEY in .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Allow Python through the firewall if Windows asks. The demo, manual items, packing and make-room swaps all work without an API key; photo analysis and Ask Astra need one.

**2. Frontend**, in a second terminal:

```powershell
cd mobile\frontend
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

### If the phone can't connect

The app looks for the backend on the same address Expo uses, at port 8000. The error message shows the address it tried.

- **VPN or several network adapters:** Expo can pick the wrong address. Disconnect the VPN, or set it yourself before `npx expo start`: `$env:REACT_NATIVE_PACKAGER_HOSTNAME="<your Wi-Fi IP>"`.
- **Tunnel mode or a deployed backend:** set `EXPO_PUBLIC_API_URL=http://host:port`.
- **Check the backend:** open `http://<your Wi-Fi IP>:8000/health` in the phone's browser.

The backend has no authentication yet, so anyone on your network who can reach it could use your API key. Only run it on a network you trust, and don't expose it to the internet as is.

## How it fits together

| Path | Role |
| --- | --- |
| `backend/app/packing.py`, `validate.py` | Packing search and its independent validator |
| `backend/app/choices.py`, `demo.py` | Make-room swaps and the demo's reserved bottle space |
| `backend/app/astra.py` | Photo-to-mesh and packing advice through OpenAI (`OPENAI_MODEL`, default `gpt-6-astra`) |
| `backend/app/collection.py` | Collection import, including web-app exports and the older cm / Y-up format |
| `frontend/src/state.ts`, `domain.ts` | Inventory reducer and shared types |
| `frontend/src/scene/` | 3D suitcase: Three.js on `expo-gl` (touch orbit, pinch, tap, drag) |
| `frontend/src/screens/` | Landing, Suitcase and Belongings tabs, item editor, assistant |

The app sends its inventory, without mesh data, to `POST /api/pack` whenever it changes. Each plan echoes the app's revision so stale responses are dropped.

## Compared with the web app (`final/`)

Ported: photo and camera capture, Astra meshes, the item editor (size, shape, compression, rotation, essential pins, duplicate, delete, merge), three clamshell suitcases, move items, layers, exploded and top views, packing playback, closing the case, make-room swaps, Ask Astra with preview and apply, collection import, and plan export through the share sheet.

Changed or left out for this MVP:

- **Landing page:** a simple welcome screen instead of the scroll-driven 3D animation.
- **glTF model assets:** items and bags with a `modelUrl` keep it but display as category shapes, and "Try a 3D model collection" is gone.
- **Shadows:** off in the 3D scene, for phone performance.
- **Photos:** resized to at most 1600 px and converted to JPEG on the phone. Exports keep photo records but not the images.
- **Packing needs the backend:** the search runs in Python, so the phone must be able to reach the server.
- **Plan validation:** runs on the server only; the app trusts plans the backend has checked.

## Credits

`frontend/assets/sample-pump-bottle.jpg` is a crop of [Black cosmetic plastic bottle](https://commons.wikimedia.org/wiki/File:Black_cosmetic_plastic_bottle.jpg) by Plasticbottlesupplier, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
