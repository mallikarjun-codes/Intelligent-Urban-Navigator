import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CityMap from './components/CityMap';
import { Search, Sparkles, Navigation, MapPin, ShieldCheck, ShieldAlert, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const markdownComponents = {
  p: ({ children }) => <p className="mb-4">{children}</p>,
  strong: ({ children }) => <span className="font-semibold text-gray-900">{children}</span>,
  ul: ({ children }) => <ul className="list-disc pl-6 space-y-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 space-y-2">{children}</ol>,
  li: ({ children }) => <li className="text-gray-700">{children}</li>,
};

function App() {
  const [query, setQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState({ 
    lat: null, 
    lng: null, 
    name: "Locating..." 
  });
  // --- NEW --- Safety Score State
  const [safetyData, setSafetyData] = useState(null);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [focusPoint, setFocusPoint] = useState(null);
  const [routeOverlay, setRouteOverlay] = useState(null);
  const [vibeMap, setVibeMap] = useState({});
  const [activeVibePlace, setActiveVibePlace] = useState(null);
  const [userId] = useState(() => {
    if (typeof window === 'undefined') return 'kyc-guest';
    const stored = localStorage.getItem('kyc_user_id');
    if (stored) return stored;
    const globalCrypto = window.crypto || null;
    const generated = `kyc-${globalCrypto?.randomUUID ? globalCrypto.randomUUID() : Date.now()}`;
    localStorage.setItem('kyc_user_id', generated);
    return generated;
  });

  const GEOCODER_ENDPOINT = import.meta.env.VITE_GEOCODER_ENDPOINT || 'https://photon.komoot.io/api';
  const metersBetween = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const refreshHiddenGems = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/gems', {
        params: { userId }
      });
      setGems(res.data.gems || []);
      setUnlockedGemIds(res.data.unlocked || []);
      setBadges(res.data.badges || []);
    } catch (error) {
      console.error('Hidden gems fetch error', error);
    }
  };

  const refreshLeaderboard = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/gems/leaderboard');
      setLeaderboard(res.data.leaderboard || []);
    } catch (error) {
      console.error('Leaderboard fetch error', error);
    }
  };

  const unlockGemAtCoords = async (lat, lng) => {
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/gems/unlock', {
        userId,
        coords: { lat, lng }
      });
      setUnlockedGemIds(res.data.unlockedIds || []);
      setBadges(res.data.badges || []);
      setLeaderboard(res.data.leaderboard || []);
      if (!res.data.alreadyUnlocked) {
        setGemToast({
          gem: res.data.gem,
          badge: res.data.badges?.slice(-1)[0],
        });
      }
    } catch (error) {
      console.error('Unlock gem error', error);
    }
  };

  const handleManualGemUnlock = (gem) => {
    if (!gem) return;
    setFocusPoint({ lat: gem.lat, lng: gem.lng, label: gem.name, zoom: 16 });
    unlockGemAtCoords(gem.lat, gem.lng);
  };

  useEffect(() => {
    refreshHiddenGems();
    refreshLeaderboard();
  }, [userId]);

  useEffect(() => {
    if (!navigator.geolocation || gems.length === 0) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        gems.forEach((gem) => {
          if (unlockedGemIds.includes(gem.id)) return;
          const dist = metersBetween(latitude, longitude, gem.lat, gem.lng);
          if (dist <= gem.radius_m) {
            unlockGemAtCoords(latitude, longitude);
          }
        });
      },
      (err) => console.warn('Gem geo error', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [gems, unlockedGemIds, userId]);

  useEffect(() => {
    if (!gemToast) return;
    const timer = setTimeout(() => setGemToast(null), 5000);
    return () => clearTimeout(timer);
  }, [gemToast]);

  // Auto-detect on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          fetchLocationDetails(lat, lng);
        },
        () => { 
          setLocationData({ lat: 20.5937, lng: 78.9629, name: "India (Default)" });
          setSafetyData({ score: 0, analysis: "Unknown", details: "Set location manually." });
        }
      );
    }
  }, []);

  // Helper: Gets City Name AND Safety Score
  const fetchLocationDetails = async (lat, lng) => {
    // 1. Get City Name
    try {
      const res = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      const city = res.data.city || res.data.locality || "Selected Location";
      setLocationData({ lat, lng, name: city });
      setFocusPoint({ lat, lng, label: city, zoom: 13 });
    } catch (e) {
      setLocationData({ lat, lng, name: "Unknown Location" });
      setFocusPoint({ lat, lng, label: "Unknown Location", zoom: 13 });
    }
    
    // 2. Get Safety Score from OUR backend
    try {
      setSafetyData(null); // Clear old score
      const safetyRes = await axios.post('http://127.0.0.1:5000/api/safety', { lat, lng });
      setSafetyData(safetyRes.data);
    } catch (e) {
      console.error("Safety check failed", e);
      setSafetyData({ score: 0, analysis: "Error", details: "Safety server offline." });
    }
  };

  const fetchPhotonSuggestions = async (searchTerm) => {
    try {
      setIsSuggesting(true);
      const res = await axios.get(`${GEOCODER_ENDPOINT}?q=${encodeURIComponent(searchTerm)}&lang=en&limit=5`);
      const features = res.data?.features || [];
      const mapped = features
        .map((feature) => {
          const props = feature.properties || {};
          const coords = feature.geometry?.coordinates || [];
          const name = props.name || props.city || props.county;
          if (!name || coords.length < 2) return null;
          const admin = props.state || props.country;
          return {
            name,
            detail: admin ? `${props.country || ''} ${admin || ''}`.trim() : props.country,
            lat: coords[1],
            lng: coords[0]
          };
        })
        .filter(Boolean);
      setCitySuggestions(mapped);
    } catch (error) {
      console.error("Suggestion lookup failed", error);
      setCitySuggestions([]);
    } finally {
      setIsSuggesting(false);
    }
  };

  // Manual City Search
  const handleManualCitySearch = async (selection) => {
    const explicit = selection || citySuggestions[0];
    const searchTerm = selection ? selection.name : cityQuery;
    if (!searchTerm) return;

    if (explicit?.lat && explicit?.lng) {
        fetchLocationDetails(explicit.lat, explicit.lng);
        setCityQuery(explicit.name);
        setCitySuggestions([]);
      return;
    }

    try {
      const res = await axios.get(`${GEOCODER_ENDPOINT}?q=${encodeURIComponent(searchTerm)}&lang=en&limit=1`);
      const feature = res.data?.features?.[0];
      if (feature) {
        const coords = feature.geometry?.coordinates || [];
        if (coords.length >= 2) {
          fetchLocationDetails(coords[1], coords[0]);
          setCityQuery(feature.properties?.name || searchTerm);
          setCitySuggestions([]);
          return;
        }
      }
      // fallback to Nominatim
      const fallback = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${searchTerm}`);
      if (fallback.data.length > 0) {
        const { lat, lon } = fallback.data[0];
          fetchLocationDetails(parseFloat(lat), parseFloat(lon));
          setCityQuery(searchTerm);
          setCitySuggestions([]);
      } else {
        alert("City not found!");
      }
    } catch (error) {
      console.error("Geocoding error", error);
      alert("City lookup failed. Please try again.");
    }
  };

  useEffect(() => {
    if (!cityQuery || cityQuery.length < 3) {
      setCitySuggestions([]);
      return;
    }
    const handler = setTimeout(() => {
      fetchPhotonSuggestions(cityQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [cityQuery]);

  const handleFocusPlace = (place) => {
    if (!place?.lat || !place?.lng) return;
    setFocusPoint({ lat: place.lat, lng: place.lng, label: place.name, zoom: 15 });
    setActiveVibePlace(place.name);
    fetchVibeScore(place);
    if (locationData.lat && locationData.lng) {
      fetchRouteOverlay({ lat: locationData.lat, lng: locationData.lng }, { lat: place.lat, lng: place.lng });
    }
  };

  const fetchVibeScore = async (place) => {
    if (!place?.name) return;
    const key = place.name.toLowerCase();
    if (vibeMap[key]) return;
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/vibe', {
        params: { name: place.name, placeId: place.name }
      });
      setVibeMap((prev) => ({ ...prev, [key]: res.data }));
    } catch (error) {
      console.error('Vibe fetch error', error);
    }
  };

  const fetchRouteOverlay = async (origin, destination) => {
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/routes', {
        origin,
        destination
      });
      const data = res.data;
      const summary = {
        safety_score: data.safeRoute?.safety_score ?? data.safety?.route_score ?? 0,
        total_lamps: data.safety?.segments?.reduce((acc, s) => acc + (s.lamp_count || 0), 0) ?? 0,
        total_amenities: data.safety?.segments?.reduce((acc, s) => acc + (s.amenity_count || 0), 0) ?? 0,
        risky_segments: data.safety?.segments?.filter((s) => s.label === 'risky').length ?? 0,
        distance_m: data.fastRoute?.distance_m,
        duration_s: data.fastRoute?.duration_s,
      };
      setRouteOverlay({
        fastRoute: data.fastRoute,
        safeSegments: data.safety?.segments || [],
        summary,
      });
    } catch (error) {
      console.error('Route overlay error', error);
      setRouteOverlay(null);
    }
  };

  // AI Query
  const handleSearch = async () => {
    if (!query) return;
    if (!locationData.lat || !locationData.lng) {
      alert("Please wait until your location is detected before asking.");
      return;
    }
    setLoading(true);
    setResponse(null);
    setRouteOverlay(null);
    setFocusPoint(null);
    setActiveVibePlace(null);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/query', { 
        query,
        location: `${locationData.name} (Lat: ${locationData.lat}, Lng: ${locationData.lng})`,
        coordinates: {
          lat: locationData.lat,
          lng: locationData.lng
        }
      });
      const payload = {
        ...res.data,
        locations: res.data.locations || []
      };
      setResponse(payload);
    } catch (error) {
      const message = error.response?.data?.error || "Backend request failed. Check that the Flask server is running.";
      setResponse({ answer_text: `Error: ${message}`, locations: [] });
    } finally {
      setLoading(false);
    }
  };

  // Helper to get safety score color
  const getSafetyColor = (score) => {
    if (score > 80) return "text-green-500";
    if (score > 50) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow relative overflow-hidden pb-20">
        {/* Background Blobs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl animate-float" />
        <div className="absolute top-20 -right-40 w-80 h-80 bg-purple-300/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        {gemToast && (
          <div className="fixed top-6 right-6 bg-white shadow-2xl border border-green-200 rounded-2xl px-5 py-4 z-50 w-72">
            <div className="font-semibold text-green-600 flex items-center gap-2">
              <Award size={16} /> Hidden Gem Unlocked!
            </div>
            <p className="text-sm text-gray-700 mt-1">{gemToast.gem?.name}</p>
            {gemToast.badge && (
              <p className="text-xs text-gray-500 mt-1">Badge earned: {gemToast.badge}</p>
            )}
          </div>
        )}

        <section className="container mx-auto px-6 py-10 text-center relative z-10">
          
          {/* HEADER */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-extrabold leading-tight"
          >
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Discover {locationData.name}
            </span>
          </motion.h1>

          {/* --- MANUAL CITY SELECTOR --- */}
          <div className="mt-6 flex justify-center items-center gap-2">
            <div className="relative w-80">
              <div className="bg-white p-1 pl-4 rounded-full shadow-md border border-gray-200 flex items-center">
                <MapPin size={16} className="text-gray-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Change City..." 
                  className="outline-none text-sm text-gray-700 flex-1"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualCitySearch()}
                />
                <button 
                  onClick={() => handleManualCitySearch()}
                  className="bg-gray-900 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-700 transition"
                >
                  SET
                </button>
              </div>
              {isSuggesting && (
                <div className="absolute right-6 top-3 text-[11px] text-gray-400">...</div>
              )}
              {citySuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-gray-200 text-left z-30 max-h-64 overflow-y-auto">
                  {citySuggestions.map((suggestion, idx) => (
                    <button
                      key={`${suggestion.name}-${idx}`}
                      onClick={() => handleManualCitySearch(suggestion)}
                      className="w-full px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 flex flex-col text-left border-b border-gray-100 last:border-b-0"
                    >
                      <span className="font-semibold text-gray-900">{suggestion.name}</span>
                      {suggestion.detail && (
                        <span className="text-xs text-gray-500">{suggestion.detail}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --- SAFETY SCORE DISPLAY --- */}
          {safetyData && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`mt-4 flex justify-center items-center gap-2 font-bold ${getSafetyColor(safetyData.score)}`}
            >
              {safetyData.score > 50 ? <ShieldCheck /> : <ShieldAlert />}
              <span>{safetyData.analysis} (Score: {safetyData.score})</span>
              <span className="text-gray-400 font-normal text-xs">({safetyData.details})</span>
            </motion.div>
          )}

          {/* MAIN AI SEARCH */}
          <div className="mt-4 mx-auto bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-2 flex items-center space-x-3 max-w-2xl">
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={`Ask anything about ${locationData.name}...`}
              className="flex-1 px-5 py-3 text-lg bg-transparent outline-none text-gray-700"
            />
            <button 
              onClick={handleSearch}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl px-6 py-3 font-medium hover:shadow-lg transition flex items-center gap-2"
            >
              {loading ? 'Thinking...' : <><Zap size={20}/> Ask AI</>}
            </button>
          </div>

          {/* AI ANSWER */}
          <AnimatePresence>
            {response && (
              <motion.div 
                key="ai-response"
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25 }}
                className="mt-8 bg-white rounded-2xl shadow-xl p-6 text-left max-w-3xl mx-auto border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                  <Sparkles size={20} />
                  <span className="font-bold">AI Insights ({locationData.name})</span>
                </div>
                {response.weather && (
                  <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 flex flex-wrap gap-3">
                    <span className="font-semibold">🌦️ {response.weather.description}</span>
                    <span>Temp: {response.weather.temperature_c ?? '--'}°C</span>
                    <span>Humidity: {response.weather.humidity_pct ?? '--'}%</span>
                    <span>Wind: {response.weather.wind_kmh ?? '--'} km/h</span>
                  </div>
                )}
                {response.locations && response.locations.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {response.locations.map((place, idx) => (
                      <button
                        key={`${place.name}-${idx}`}
                        onClick={() => handleFocusPlace(place)}
                        className="px-3 py-1.5 rounded-full border border-blue-200 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                      >
                        📍 {place.name}
                      </button>
                    ))}
                  </div>
                )}
                {activeVibePlace && vibeMap[activeVibePlace.toLowerCase()] && (
                  <div className="mb-4 bg-purple-50 border border-purple-100 rounded-2xl p-4 text-sm text-purple-800 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Vibe Meter · {activeVibePlace}</span>
                      <span className="text-xs uppercase tracking-wide">
                        {vibeMap[activeVibePlace.toLowerCase()].label} · {vibeMap[activeVibePlace.toLowerCase()].positive_pct}% positive
                      </span>
                    </div>
                    <p className="mt-2 text-gray-700">
                      {vibeMap[activeVibePlace.toLowerCase()].snippets?.[0]}
                    </p>
                  </div>
                )}
                {response.error && (
                  <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    Service note: {response.error}
                  </div>
                )}
                <div className="text-gray-700 text-lg leading-relaxed">
                  <ReactMarkdown components={markdownComponents}>
                    {response.answer_text}
                  </ReactMarkdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3D MAP */}
          {locationData.lat && (
             <motion.div 
                layout
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-12 max-w-5xl mx-auto"
             >
                <CityMap
                  lat={locationData.lat}
                  lng={locationData.lng}
                  cityName={locationData.name}
                  places={response?.locations || []}
                  focusPoint={focusPoint}
                  routeOverlay={routeOverlay}
                />
             </motion.div>
          )}

          {gems.length > 0 && (
            <div className="mt-12 bg-white/80 border border-gray-200 rounded-3xl shadow-xl p-6 text-left">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles size={20} className="text-purple-500" /> Hidden Gem Hunt
                  </h3>
                  <p className="text-sm text-gray-500">Move within 20m of a gem to unlock badges and climb the leaderboard.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
                    <Award size={16} /> Badges: {badges.length}
                  </div>
                  <div className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
                    <Crown size={16} /> Leaderboard: {leaderboard[0]?.count || 0} pts top
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {gems.map((gem) => {
                  const unlocked = unlockedGemIds.includes(gem.id);
                  return (
                    <div
                      key={gem.id}
                      className={`rounded-2xl border p-4 flex flex-col gap-2 ${unlocked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{gem.name}</p>
                          <p className="text-xs text-gray-500">{gem.hint}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-400">{unlocked ? 'Unlocked' : `${gem.radius_m}m radius`}</span>
                      </div>
                      <button
                        onClick={() => handleManualGemUnlock(gem)}
                        className="text-sm text-blue-600 underline self-start disabled:text-gray-400"
                        disabled={unlocked}
                      >
                        {unlocked ? 'Pinned on map' : 'Mark as found'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <Crown size={16} /> Leaderboard
                </h4>
                <div className="mt-2 space-y-2">
                  {leaderboard.length === 0 && <p className="text-sm text-gray-500">No explorers yet.</p>}
                  {leaderboard.map((entry, idx) => (
                    <div key={entry.userId} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-xl">
                      <span>#{idx + 1} {entry.userId.replace('kyc-', 'User ')}</span>
                      <span className="font-semibold">{entry.count} gems</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
export default App;