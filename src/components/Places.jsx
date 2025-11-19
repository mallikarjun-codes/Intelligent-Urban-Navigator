import React, { useState, useEffect } from 'react';
import { MapPin, Star, Navigation, BookmarkPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import CityMap from './CityMap';
import { useAuth } from '../contexts/AuthContext';
import { addFavoritePlace } from '../utils/userData';

const Places = () => {
  const [locationData, setLocationData] = useState({ lat: null, lng: null, name: "Loading..." });
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusPoint, setFocusPoint] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const { user, openAuthModal } = useAuth();
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    // Load city from localStorage (set by App.jsx)
    const savedCity = localStorage.getItem('selectedCity');
    if (savedCity) {
      const city = JSON.parse(savedCity);
      setLocationData(city);
      fetchPopularPlaces(city.name, city.lat, city.lng);
    } else {
      // Fallback: try to get current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            fetchCityName(lat, lng);
          },
          () => {
            setLocationData({ lat: 20.5937, lng: 78.9629, name: "India (Default)" });
            fetchPopularPlaces("India", 20.5937, 78.9629);
          }
        );
      } else {
        setLocationData({ lat: 20.5937, lng: 78.9629, name: "India (Default)" });
        fetchPopularPlaces("India", 20.5937, 78.9629);
      }
    }
  }, [user]);

  const fetchCityName = async (lat, lng) => {
    try {
      const res = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      const city = res.data.city || res.data.locality || "Selected Location";
      const cityData = { lat, lng, name: city };
      setLocationData(cityData);
      fetchPopularPlaces(city, lat, lng);
    } catch (e) {
      setLocationData({ lat, lng, name: "Unknown Location" });
      fetchPopularPlaces("Unknown Location", lat, lng);
    }
  };

  const fetchPopularPlaces = async (cityName, lat, lng) => {
    setLoading(true);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/query', {
        query: `What are the most popular and must-visit places in ${cityName}? Include tourist attractions, landmarks, restaurants, parks, and cultural sites.`,
        location: `${cityName} (Lat: ${lat}, Lng: ${lng})`,
        coordinates: { lat, lng }
      });
      
      if (res.data.locations && res.data.locations.length > 0) {
        setPlaces(res.data.locations);
      } else {
        // Fallback: generate some default places if AI doesn't return locations
        setPlaces([]);
      }
    } catch (error) {
      console.error('Error fetching popular places:', error);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceClick = (place) => {
    setSelectedPlace(place);
    setFocusPoint({ lat: place.lat, lng: place.lng, label: place.name, zoom: 15 });
  };

  const handleSaveFavorite = (place) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    addFavoritePlace(user.id, {
      name: place.name,
      address: place.address || locationData.name,
      lat: place.lat,
      lng: place.lng,
    });
    setSaveMessage(`“${place.name}” saved to favorites.`);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-10 text-center max-w-xl">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Explore Places
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Sign in to view curated places for your selected city and save favorites to your dashboard.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition"
          >
            Login to continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Background Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/40 via-indigo-400/30 to-purple-400/20 dark:from-blue-500/20 dark:via-indigo-500/15 dark:to-purple-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute top-20 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/40 via-pink-400/30 to-blue-400/20 dark:from-purple-500/20 dark:via-pink-500/15 dark:to-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-72 h-72 bg-gradient-to-br from-indigo-400/30 via-blue-400/20 to-cyan-400/20 dark:from-indigo-500/15 dark:via-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '6s' }} />
      
      <div className="container mx-auto px-6 py-10 relative z-10">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold mb-2 text-center"
        >
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Popular Places in {locationData.name}
          </span>
        </motion.h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">Discover the best spots to visit</p>
        {saveMessage && (
          <div className="max-w-2xl mx-auto mb-6 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-2xl px-4 py-3 border border-green-100 dark:border-green-800">
            {saveMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading popular places...</p>
          </div>
        ) : places.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No places found. Try selecting a different city.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {places.map((place, idx) => (
                <motion.div
                  key={`${place.name}-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => handlePlaceClick(place)}
                  className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-105 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{place.name}</h3>
                    </div>
                  </div>
                    {place.address && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{place.address}</p>
                    )}
                    {place.note && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">{place.note}</p>
                    )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => handlePlaceClick(place)}
                      className="text-blue-600 dark:text-blue-300 text-sm font-semibold flex items-center gap-1 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      <Navigation size={14} />
                      View on Map
                    </button>
                    <button
                      onClick={() => handleSaveFavorite(place)}
                      className="text-purple-600 dark:text-purple-300 text-sm font-semibold flex items-center gap-1 hover:text-purple-800 dark:hover:text-purple-200"
                    >
                      <BookmarkPlus size={14} />
                      Save to Favorites
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {locationData.lat && locationData.lng && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12"
              >
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Map View</h2>
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                  <CityMap
                    lat={locationData.lat}
                    lng={locationData.lng}
                    cityName={locationData.name}
                    places={places}
                    focusPoint={focusPoint}
                    routeOverlay={null}
                  />
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Places;

