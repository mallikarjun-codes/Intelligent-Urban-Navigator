import React, { useState, useEffect } from 'react';
import { MapPin, Star, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import CityMap from './CityMap';

const Places = () => {
  const [locationData, setLocationData] = useState({ lat: null, lng: null, name: "Loading..." });
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusPoint, setFocusPoint] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);

  useEffect(() => {
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
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-10">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold mb-2 text-center"
        >
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Popular Places in {locationData.name}
          </span>
        </motion.h1>
        <p className="text-center text-gray-600 mb-8">Discover the best spots to visit</p>

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
                  className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-105 border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <h3 className="font-bold text-lg text-gray-900">{place.name}</h3>
                    </div>
                  </div>
                  {place.address && (
                    <p className="text-sm text-gray-600 mb-3">{place.address}</p>
                  )}
                  {place.note && (
                    <p className="text-sm text-gray-700 italic">{place.note}</p>
                  )}
                  <button className="mt-4 text-blue-600 text-sm font-semibold flex items-center gap-1 hover:text-blue-800">
                    <Navigation size={14} />
                    View on Map
                  </button>
                </motion.div>
              ))}
            </div>

            {locationData.lat && locationData.lng && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12"
              >
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Map View</h2>
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
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

