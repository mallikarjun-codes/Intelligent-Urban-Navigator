import os
import json
import math
import time
import uuid
import hashlib
from functools import wraps
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai
import requests  # Make sure you have run "pip install requests"
from pathlib import Path
from threading import Lock
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer  # type: ignore

# Import your safety score function
def get_safety_score(lat, lng):
    overpass_url = "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
    overpass_query = f"""
    [out:json];
    (
      node["highway"="street_lamp"](around:500, {lat}, {lng});
      node["amenity"="police"](around:500, {lat}, {lng});
    );
    out count;
    """
    try:
        response = requests.get(overpass_url, params={'data': overpass_query}, timeout=12)
        data = response.json()
        element_count = int(data['elements'][0]['tags']['total'])
        base_score = 20
        safety_points = min(element_count * 1.5, 75)
        score = int(base_score + safety_points)
        
        if score > 85: analysis = "Very Well Lit"
        elif score > 60: analysis = "Well Lit"
        elif score > 40: analysis = "Moderately Lit"
        else: analysis = "Poorly Lit"

        return {
            "score": score,
            "analysis": analysis,
            "details": f"Found {element_count} street lights & safety points."
        }
    except Exception as e:
        print(f"Safety API Error: {e}")
        return {
            "score": 55,
            "analysis": "Estimated",
            "details": "Live safety data unavailable; showing baseline score."
        }


def get_live_weather(lat, lng):
    weather_url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
    }
    weather_codes = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Light rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Light snow",
        73: "Moderate snow",
        75: "Heavy snow",
        80: "Rain showers",
        81: "Heavy rain showers",
        95: "Thunderstorm",
        99: "Hail thunderstorm"
    }
    resp = requests.get(weather_url, params=params, timeout=8)
    resp.raise_for_status()
    current = resp.json().get("current", {})
    code = current.get("weather_code")
    return {
        "temperature_c": current.get("temperature_2m"),
        "humidity_pct": current.get("relative_humidity_2m"),
        "wind_kmh": current.get("wind_speed_10m"),
        "code": code,
        "description": weather_codes.get(code, "Latest weather data")
    }

# --- Flask App Setup ---
load_dotenv()
app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
REVIEW_FILE = DATA_DIR / "review_samples.json"
GEMS_FILE = DATA_DIR / "hidden_gems.json"
PROGRESS_FILE = DATA_DIR / "gem_progress.json"
USERS_FILE = DATA_DIR / "users.json"
AUTH_SALT = os.getenv("AUTH_SALT", "kyc-default-salt")


def load_json_file(path: Path, default):
    if path.exists():
        try:
            with path.open("r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception as exc:
            print(f"Failed to parse {path}: {exc}. Recreating with defaults.")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(default, fh, indent=2)
    return default


review_samples = load_json_file(REVIEW_FILE, {})
hidden_gems = load_json_file(GEMS_FILE, [])
progress_data = load_json_file(PROGRESS_FILE, {"users": {}})
users_data = load_json_file(USERS_FILE, {"users": []})
progress_lock = Lock()
sentiment_analyzer = SentimentIntensityAnalyzer()
VIBE_CACHE_SECONDS = 900
vibe_cache = {}
hidden_gems_map = {gem["id"]: gem for gem in hidden_gems}
active_sessions = {}
user_index = {user["id"]: user for user in users_data.get("users", [])}


def save_users_file():
    with USERS_FILE.open("w", encoding="utf-8") as fh:
        json.dump(users_data, fh, indent=2)


def hash_password(password: str) -> str:
    salted = f"{password}{AUTH_SALT}"
    return hashlib.sha256(salted.encode("utf-8")).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


def get_user_by_email(email: str):
    if not email:
        return None
    cleaned = email.lower().strip()
    for user in users_data.get("users", []):
        if user.get("email", "").lower() == cleaned:
            return user
    return None


def get_user_by_id(user_id: str):
    if not user_id:
        return None
    return user_index.get(user_id)


def create_user(name: str, email: str, password: str):
    user = {
        "id": str(uuid.uuid4()),
        "name": name.strip(),
        "email": email.lower().strip(),
        "password_hash": hash_password(password),
    }
    users_data.setdefault("users", []).append(user)
    user_index[user["id"]] = user
    save_users_file()
    return user


def create_session(user_id: str):
    token = str(uuid.uuid4())
    active_sessions[token] = user_id
    return token


def extract_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header:
        return None
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return auth_header.strip()


def require_auth(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = extract_token()
        if not token:
            return jsonify({"error": "Unauthorized"}), 401
        user_id = active_sessions.get(token)
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        g.current_user = user
        g.current_token = token
        return func(*args, **kwargs)

    return wrapper


@app.route("/api/auth/register", methods=["POST"])
def register_user_route():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400
    if get_user_by_email(email):
        return jsonify({"error": "Email already registered."}), 409
    user = create_user(name, email, password)
    token = create_session(user["id"])
    return jsonify({
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    })


@app.route("/api/auth/login", methods=["POST"])
def login_user_route():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400
    user = get_user_by_email(email)
    if not user or not verify_password(password, user.get("password_hash", "")):
        return jsonify({"error": "Invalid credentials."}), 401
    token = create_session(user["id"])
    return jsonify({
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    })


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def get_profile():
    user = g.current_user
    return jsonify({"user": {"id": user["id"], "name": user["name"], "email": user["email"]}})


@app.route("/api/auth/logout", methods=["POST"])
@require_auth
def logout_user():
    token = g.get("current_token")
    if token and token in active_sessions:
        active_sessions.pop(token, None)
    return jsonify({"status": "ok"})

# --- AI CONFIGURATION ---
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash')  # Verified model
else:
    model = None

GEOCODER_ENDPOINT = os.getenv("GEOCODER_ENDPOINT", "https://photon.komoot.io/api")
ORS_API_KEY = os.getenv("ORS_API_KEY")


def geocode_place(name, lat=None, lng=None):
    params = {
        "q": name,
        "limit": 1,
        "lang": "en",
    }
    if lat is not None and lng is not None:
        params["lat"] = lat
        params["lon"] = lng
    try:
        resp = requests.get(GEOCODER_ENDPOINT, params=params, timeout=8)
        resp.raise_for_status()
        feature = (resp.json().get("features") or [None])[0]
        if not feature:
            return None
        coords = feature.get("geometry", {}).get("coordinates", [])
        if len(coords) < 2:
            return None
        props = feature.get("properties", {})
        place = {
            "name": props.get("name") or name,
            "lat": coords[1],
            "lng": coords[0],
            "address": props.get("street") or props.get("city") or props.get("state"),
        }
        if lat is not None and lng is not None:
            distance = haversine_distance_m(lat, lng, place["lat"], place["lng"])
            if distance > 25000:
                return None
        return place
    except Exception as ge:
        print(f"Geocoder failed for {name}: {ge}")
        return None


def haversine_distance_m(lat1, lng1, lat2, lng2):
    """Approximate distance in meters between two WGS84 points."""
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def fetch_fast_route(origin, destination):
    """
    Uses OpenRouteService (foot-walking) to get a baseline 'fast' route.
    origin / destination: dicts with lat, lng
    """
    if not ORS_API_KEY:
        raise RuntimeError("ORS_API_KEY missing. Add it to your .env to enable routing.")

    url = "https://api.openrouteservice.org/v2/directions/foot-walking"
    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json",
    }
    body = {
        "coordinates": [
            [origin["lng"], origin["lat"]],
            [destination["lng"], destination["lat"]],
        ],
        "instructions": False,
    }
    resp = requests.post(url, headers=headers, json=body, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    feature = (data.get("features") or [None])[0]
    if not feature:
        raise RuntimeError("No route found between origin and destination.")
    props = feature.get("properties", {})
    summary = props.get("summary", {})
    geometry = feature.get("geometry", {})
    coords = geometry.get("coordinates") or []
    # ORS coords are [lng, lat]
    return {
        "coordinates": coords,
        "distance_m": summary.get("distance"),
        "duration_s": summary.get("duration"),
    }


def analyze_route_safety(coords):
    """
    Takes a list of [lng, lat] pairs and computes per-chunk safety using Overpass.
    Returns overall score (0-100) and segment-level metrics for visualization.
    """
    if len(coords) < 2:
        return {"route_score": 0, "segments": []}

    lats = [pt[1] for pt in coords]
    lngs = [pt[0] for pt in coords]
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)

    # Expand the box slightly to capture nearby features
    margin = 0.002  # ~200m
    south, west = min_lat - margin, min_lng - margin
    north, east = max_lat + margin, max_lng + margin

    overpass_url = "http://overpass-api.de/api/interpreter"
    overpass_query = f"""
    [out:json];
    (
      node["highway"="street_lamp"]({south},{west},{north},{east});
      node["amenity"~"police|hospital|pharmacy"]({south},{west},{north},{east});
      way["highway"~"service|unclassified"]({south},{west},{north},{east});
    );
    out center;
    """
    lamps = []
    amenities = []
    bad_centers = []

    try:
        r = requests.get(overpass_url, params={"data": overpass_query}, timeout=25)
        r.raise_for_status()
        data = r.json()
        for el in data.get("elements", []):
            etype = el.get("type")
            tags = el.get("tags") or {}
            if etype == "node":
                lat = el.get("lat")
                lng = el.get("lon")
                if tags.get("highway") == "street_lamp":
                    lamps.append((lat, lng))
                elif tags.get("amenity") in {"police", "hospital", "pharmacy"}:
                    amenities.append((lat, lng))
            elif etype == "way":
                center = el.get("center")
                if center:
                    bad_centers.append((center.get("lat"), center.get("lon")))
    except Exception as e:
        print(f"Route safety Overpass error: {e}")

    # Chunk route into small segments (approx every ~100–150m)
    segments = []
    chunk_size = max(2, min(8, len(coords) // 20 or 3))
    for i in range(0, len(coords) - 1, chunk_size):
        group = coords[i : min(i + chunk_size, len(coords))]
        if len(group) < 2:
            continue
        # midpoint of group
        mid_idx = len(group) // 2
        mid_lng, mid_lat = group[mid_idx]

        # count features within radius
        radius_m = 120.0
        lamp_count = sum(
            1
            for (la, lo) in lamps
            if haversine_distance_m(mid_lat, mid_lng, la, lo) <= radius_m
        )
        amenity_count = sum(
            1
            for (la, lo) in amenities
            if haversine_distance_m(mid_lat, mid_lng, la, lo) <= radius_m
        )
        bad_here = any(
            haversine_distance_m(mid_lat, mid_lng, la, lo) <= radius_m
            for (la, lo) in bad_centers
        )

        # Scoring heuristic: base 50, reward lights/amenities, penalize bad roads
        score = 50 + 10 * lamp_count + 20 * amenity_count - (30 if bad_here else 0)
        score = max(0, min(100, score))
        if score >= 75:
            label = "safe"
        elif score >= 45:
            label = "moderate"
        else:
            label = "risky"

        segments.append(
            {
                "start_index": i,
                "end_index": i + len(group) - 1,
                "center": {"lat": mid_lat, "lng": mid_lng},
                "score": int(score),
                "label": label,
                "lamp_count": lamp_count,
                "amenity_count": amenity_count,
                "bad_road": bad_here,
            }
        )

    if not segments:
        return {"route_score": 0, "segments": []}

    avg_score = sum(s["score"] for s in segments) / len(segments)
    return {"route_score": int(avg_score), "segments": segments}


def save_progress_data():
    with progress_lock:
        with PROGRESS_FILE.open("w", encoding="utf-8") as fh:
            json.dump(progress_data, fh, indent=2)


def get_user_progress(user_id: str):
    with progress_lock:
        profile = progress_data["users"].setdefault(
            user_id,
            {"badges": [], "unlocked": []},
        )
        return profile


def compute_leaderboard():
    with progress_lock:
        entries = []
        for uid, data in progress_data.get("users", {}).items():
            user = get_user_by_id(uid)
            entries.append({
                "userId": uid,
                "name": user.get("name") if user else "Explorer",
                "count": len(data.get("unlocked", []))
            })
    entries.sort(key=lambda item: item["count"], reverse=True)
    return entries[:5]


def fetch_sample_reviews(place_name: str):
    key = place_name.lower()
    if key in review_samples:
        return review_samples[key]
    # fallback: fuzzy contains
    for stored_key, texts in review_samples.items():
        if key in stored_key or stored_key in key:
            return texts
    return None


def classify_vibe(score: float):
    if score >= 0.45:
        return "Chill"
    if score >= 0.15:
        return "Balanced"
    if score >= -0.15:
        return "Mixed"
    return "Chaotic"

# --- API ENDPOINT 1: THE AI BRAIN ---
@app.route('/api/query', methods=['POST'])
@require_auth
def handle_query():
    data = request.get_json()
    user_query = data.get('query')
    user_location = data.get('location', "Unknown Location")
    coords = data.get('coordinates') or {}
    lat = coords.get('lat')
    lng = coords.get('lng')
    
    if not user_query:
        return jsonify({"error": "Query is required"}), 400

    live_weather = None
    if lat is not None and lng is not None:
        try:
            live_weather = get_live_weather(lat, lng)
        except Exception as e:
            print(f"Weather fetch failed: {e}")

    weather_context = json.dumps(live_weather, indent=2) if live_weather else "null"

    prompt = f"""
    You are CityScout, a hyper-local AI concierge that helps users currently in {user_location}.
    User Question: "{user_query}"

    Response rules:
    - Stay within a 20km radius of {user_location}; flag anything beyond that distance.
    - Return friendly Markdown text only. Never show code, tool configurations, or implementation steps.
    - Provide up to three concise recommendations formatted as a numbered list. Use **bold** for the place name, add the neighborhood/road, and include one standout detail (hours, vibe, specialty, etc.).
    - If you are unsure, say so and suggest how the user can verify locally.
    - Finish with one short safety or navigation tip relevant to the request.
    - When the user asks about weather, incorporate this live observation JSON without changing numbers:
      {weather_context}
    - After your markdown answer, append a line exactly like this:
      POI_CANDIDATES: name|note; name|note
      Include up to three precise places that answer the query (use '-' if no note). If none, write 'POI_CANDIDATES: none'.
    """
    if model is None:
        return jsonify({"error": "GEMINI_API_KEY missing. Add it to a .env file and restart the backend."}), 500

    try:
        response = model.generate_content(prompt)
        raw_answer = response.text or ""
        poi_candidates = []
        answer_text = raw_answer
        if "POI_CANDIDATES:" in raw_answer:
            answer_text, poi_blob = raw_answer.split("POI_CANDIDATES:", 1)
            first_line = poi_blob.strip().splitlines()[0]
            if first_line.strip().lower() != "none":
                entries = [entry.strip() for entry in first_line.split(";") if entry.strip()]
                for entry in entries:
                    if "|" in entry:
                        name, note = entry.split("|", 1)
                    else:
                        name, note = entry, "-"
                    poi_candidates.append({"name": name.strip(), "note": note.strip()})
        locations = []
        for candidate in poi_candidates:
            geo = geocode_place(candidate["name"], lat, lng)
            if geo:
                geo["note"] = None if candidate["note"] == "-" else candidate["note"]
                locations.append(geo)
        return jsonify({
            "answer_text": answer_text.strip(),
            "locations": locations,
            "weather": live_weather
        })
    except Exception as e:
        print(f"AI Error: {e}")
        if live_weather:
            fallback = (
                f"Live weather for {user_location}:\n"
                f"- Condition: {live_weather.get('description', 'N/A')}\n"
                f"- Temperature: {live_weather.get('temperature_c', 'N/A')}°C\n"
                f"- Humidity: {live_weather.get('humidity_pct', 'N/A')}%\n"
                f"- Wind: {live_weather.get('wind_kmh', 'N/A')} km/h\n\n"
                "AI insights are temporarily unavailable (service limit reached). "
                "Please try again in a moment."
            )
            return jsonify({
                "answer_text": fallback,
                "locations": [],
                "weather": live_weather,
                "error": str(e)
            }), 503
        return jsonify({"error": str(e)}), 500

# --- API ENDPOINT 2: THE SAFETY SCORE ---
@app.route('/api/safety', methods=['POST'])
@require_auth
def handle_safety():
    data = request.get_json()
    lat = data.get('lat')
    lng = data.get('lng')
    
    if not lat or not lng:
        return jsonify({"error": "Coordinates required"}), 400
        
    result = get_safety_score(lat, lng)
    return jsonify(result)


@app.route('/api/vibe', methods=['GET'])
@require_auth
def handle_vibe():
    place_id = request.args.get("placeId")
    place_name = request.args.get("name") or place_id
    if not place_name:
        return jsonify({"error": "placeId or name is required"}), 400
    cache_key = (place_id or place_name).lower()
    cached = vibe_cache.get(cache_key)
    now = time.time()
    if cached and cached["expires_at"] > now:
        return jsonify(cached["payload"])

    reviews = fetch_sample_reviews(place_name)
    if not reviews:
        return jsonify({"error": "No review samples available for this place."}), 404

    compounds = [
        sentiment_analyzer.polarity_scores(text)["compound"] for text in reviews
    ]
    avg = sum(compounds) / len(compounds)
    positive_pct = int(
        (sum(1 for score in compounds if score >= 0.05) / len(compounds)) * 100
    )
    vibe_label = classify_vibe(avg)
    payload = {
        "place": place_name,
        "score": round(avg, 3),
        "label": vibe_label,
        "positive_pct": positive_pct,
        "snippets": reviews[:5],
        "sample_size": len(reviews),
        "refreshed_at": now,
    }
    vibe_cache[cache_key] = {"payload": payload, "expires_at": now + VIBE_CACHE_SECONDS}
    return jsonify(payload)


@app.route('/api/gems', methods=['GET'])
@require_auth
def list_gems():
    profile = get_user_progress(g.current_user["id"])
    unlocked = profile.get("unlocked", [])
    badges = profile.get("badges", [])
    return jsonify({
        "gems": hidden_gems,
        "unlocked": unlocked,
        "badges": badges,
    })


@app.route('/api/gems/leaderboard', methods=['GET'])
@require_auth
def gems_leaderboard():
    return jsonify({"leaderboard": compute_leaderboard()})


@app.route('/api/gems/unlock', methods=['POST'])
@require_auth
def unlock_gem():
    data = request.get_json() or {}
    coords = data.get("coords") or {}
    lat = coords.get("lat")
    lng = coords.get("lng")
    if lat is None or lng is None:
        return jsonify({"error": "coords.lat and coords.lng are required"}), 400

    candidate = None
    for gem in hidden_gems:
        radius = gem.get("radius_m", 20)
        distance = haversine_distance_m(lat, lng, gem["lat"], gem["lng"])
        if distance <= radius:
            candidate = gem
            break

    if not candidate:
        return jsonify({"error": "No hidden gem nearby"}), 404

    profile = get_user_progress(g.current_user["id"])
    already = candidate["id"] in profile.get("unlocked", [])
    if not already:
        profile["unlocked"].append(candidate["id"])
        badge = candidate.get("badge")
        if badge and badge not in profile.get("badges", []):
            profile["badges"].append(badge)
        save_progress_data()
    leaderboard = compute_leaderboard()
    return jsonify({
        "unlocked": not already,
        "alreadyUnlocked": already,
        "gem": candidate,
        "badges": profile.get("badges", []),
        "unlockedIds": profile.get("unlocked", []),
        "leaderboard": leaderboard,
    })


@app.route('/api/routes', methods=['POST'])
@require_auth
def handle_routes():
    """
    Computes a 'fast' walking route plus a safety analysis overlay.
    Body:
    {
      "origin": {"lat": ..., "lng": ...},
      "destination": {"lat": ..., "lng": ...}
    }
    """
    data = request.get_json() or {}
    origin = data.get("origin") or {}
    dest = data.get("destination") or {}
    if origin.get("lat") is None or origin.get("lng") is None:
        return jsonify({"error": "origin.lat and origin.lng are required"}), 400
    if dest.get("lat") is None or dest.get("lng") is None:
        return jsonify({"error": "destination.lat and destination.lng are required"}), 400

    try:
        fast_route = fetch_fast_route(
            {"lat": float(origin["lat"]), "lng": float(origin["lng"])},
            {"lat": float(dest["lat"]), "lng": float(dest["lng"])},
        )
    except Exception as e:
        print(f"Route engine error: {e}")
        return jsonify({"error": str(e)}), 500

    safety = analyze_route_safety(fast_route["coordinates"])

    # For now, safeRoute shares geometry with fastRoute but the frontend
    # will color each segment green/yellow/red based on safety.segments.
    return jsonify(
        {
            "fastRoute": fast_route,
            "safeRoute": {
                "coordinates": fast_route["coordinates"],
                "distance_m": fast_route["distance_m"],
                "duration_s": fast_route["duration_s"],
                "safety_score": safety["route_score"],
            },
            "safety": safety,
        }
    )

# --- RUN THE SERVER ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)