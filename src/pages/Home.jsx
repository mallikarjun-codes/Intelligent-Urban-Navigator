import React, { useState, useEffect } from 'react';
import CityMap from '../components/CityMap';
import { Sparkles, MapPin, ShieldCheck, ShieldAlert, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';
import { addSearchHistory } from '../utils/userData';

const markdownComponents = {
  p: ({ children }) => <p className="mb-4 text-gray-700 dark:text-gray-200">{children}</p>,
  strong: ({ children }) => (
    <span className="font-semibold text-gray-900 dark:text-gray-100">{children}</span>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-200">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 space-y-2 text-gray-700 dark:text-gray-200">{children}</ol>
  ),
  li: ({ children }) => <li className="text-gray-700 dark:text-gray-200">{children}</li>,
};

function Home() {
  const [query, setQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState({
    lat: null,
    lng: null,
    name: "Locating..."
  });
  const [safetyData, setSafetyData] = useState(null);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [focusPoint, setFocusPoint] = useState(null);
  const [routeOverlay, setRouteOverlay] = useState(null);
  const [vibeMap, setVibeMap] = useState({});
  const [activeVibePlace, setActiveVibePlace] = useState(null);
  const { user, openAuthModal } = useAuth();

  const GEOCODER_ENDPOINT = import.meta.env.VITE_GEOCODER_ENDPOINT || 'https://photon.komoot.io/api';
  
  // Auto-detect on load
  useEffect(() => {
    if (!user) return;
    // Check if city is saved in localStorage
    const savedCity = localStorage.getItem('selectedCity');
    if (savedCity) {
      const city = JSON.parse(savedCity);
      setLocationData(city);
      fetchLocationDetails(city.lat, city.lng);
    } else if (navigator.geolocation) {
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
  }, [user]);

  // Helper: Gets City Name AND Safety Score
  const fetchLocationDetails = async (lat, lng) => {
    // 1. Get City Name
    try {
      const res = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      const city = res.data.city || res.data.locality || "Selected Location";
      const cityData = { lat, lng, name: city };
      setLocationData(cityData);
      setFocusPoint({ lat, lng, label: city, zoom: 13 });
      // Save to localStorage for Places page
      localStorage.setItem('selectedCity', JSON.stringify(cityData));
    } catch (e) {
      setLocationData({ lat, lng, name: "Unknown Location" });
      setFocusPoint({ lat, lng, label: "Unknown Location", zoom: 13 });
    }
    
    // 2. Get Safety Score from OUR backend
    try {
      setSafetyData(null);
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
    if (!user) {
      openAuthModal('login');
      return;
    }
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
    if (!user) return;
    if (!cityQuery || cityQuery.length < 3) {
      setCitySuggestions([]);
      return;
    }
    const handler = setTimeout(() => {
      fetchPhotonSuggestions(cityQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [cityQuery, user]);

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
    if (!user) {
      openAuthModal('login');
      return;
    }
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
      addSearchHistory(user.id, {
        query,
        location: locationData.name,
      });
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
    <main className="flex-grow relative overflow-hidden pb-20">
      {/* Enhanced Background Blobs with gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/40 via-indigo-400/30 to-purple-400/20 dark:from-blue-500/20 dark:via-indigo-500/15 dark:to-purple-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute top-20 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/40 via-pink-400/30 to-blue-400/20 dark:from-purple-500/20 dark:via-pink-500/15 dark:to-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-72 h-72 bg-gradient-to-br from-indigo-400/30 via-blue-400/20 to-cyan-400/20 dark:from-indigo-500/15 dark:via-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '6s' }} />
      <section className="container mx-auto px-6 py-10 text-center relative z-10">
        
        {/* HEADER */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-extrabold leading-tight"
        >
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Discover {locationData.name}
          </span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
        >
          Your intelligent urban navigation companion. Get AI-powered insights, discover hidden gems, 
          and explore your city with confidence.
        </motion.p>

        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 max-w-2xl mx-auto bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-200 text-sm rounded-2xl px-4 py-3 border border-yellow-100 dark:border-yellow-800"
          >
            Please log in to unlock personalized AI search, safety insights, and saved places.
          </motion.div>
        )}

        {/* --- MANUAL CITY SELECTOR --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Want to explore a different city? Search and select below:
          </p>
          <div className="flex justify-center items-center gap-2">
          <div className="relative w-80">
            <div className="bg-white p-1 pl-4 rounded-full shadow-md border border-gray-200 flex items-center">
              <MapPin size={16} className="text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Change City..." 
                className="outline-none text-sm text-gray-700 flex-1"
                disabled={!user}
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualCitySearch()}
              />
              <button 
                onClick={() => handleManualCitySearch()}
                className="bg-gray-900 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-700 transition"
                disabled={!user}
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
        </motion.div>

        {/* --- SAFETY SCORE DISPLAY --- */}
        {safetyData && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-6"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Current Location Safety Analysis:
            </p>
            <div className={`flex justify-center items-center gap-2 font-bold ${getSafetyColor(safetyData.score)}`}>
              {safetyData.score > 50 ? <ShieldCheck /> : <ShieldAlert />}
              <span>{safetyData.analysis} (Score: {safetyData.score})</span>
              <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">({safetyData.details})</span>
            </div>
          </motion.div>
        )}

        {/* MAIN AI SEARCH */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Ask our AI assistant anything about {locationData.name}. Try questions like:
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs">
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
              "best restaurants near me"
            </span>
            <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full">
              "tourist attractions"
            </span>
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full">
              "safety tips"
            </span>
          </div>
          <div className="mt-4 mx-auto bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex items-center space-x-3 max-w-2xl transition-colors duration-300">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={`Ask anything about ${locationData.name}...`}
              className="flex-1 px-5 py-3 text-lg bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-60"
              disabled={!user}
          />
          <button 
            onClick={handleSearch}
            disabled={loading || !user}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl px-6 py-3 font-medium hover:shadow-lg transition flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? 'Thinking...' : <><Zap size={20}/> Ask AI</>}
          </button>
        </div>
        </motion.div>

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
              className="mt-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-left max-w-3xl mx-auto border border-gray-100 dark:border-gray-700 transition-colors duration-300"
            >
              <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
                <Sparkles size={20} />
                <span className="font-bold">AI Insights ({locationData.name})</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Our AI has analyzed your query and provided personalized recommendations based on your location.
              </p>
              {response.weather && (
                <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 flex flex-wrap gap-3">
                  <span className="font-semibold">🌦️ {response.weather.description}</span>
                  <span>Temp: {response.weather.temperature_c ?? '--'}°C</span>
                  <span>Humidity: {response.weather.humidity_pct ?? '--'}%</span>
                  <span>Wind: {response.weather.wind_kmh ?? '--'} km/h</span>
                </div>
              )}
              {response.locations && response.locations.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Recommended Places (Click to view on map):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {response.locations.map((place, idx) => (
                      <button
                        key={`${place.name}-${idx}`}
                        onClick={() => handleFocusPlace(place)}
                        className="px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-700 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
                      >
                        📍 {place.name}
                      </button>
                    ))}
                  </div>
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
              <div className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                <ReactMarkdown components={markdownComponents}>
                  {response.answer_text}
                </ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* INTERACTIVE MAP */}
        {locationData.lat && (
           <motion.div 
              layout
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-16 max-w-5xl mx-auto"
           >
              <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Interactive City Map
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  Explore {locationData.name} on our interactive map. Click on any place from AI recommendations 
                  to see it highlighted, or use the map to discover new locations around you.
                </p>
              </div>
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
      </section>
    </main>
  );
}

export default Home;

