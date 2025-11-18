import React, { useEffect, useRef } from 'react';
import Map, {
  Marker,
  NavigationControl,
  GeolocateControl,
  Source,
  Layer,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';

const CityMap = ({
  lat,
  lng,
  cityName,
  places = [],
  focusPoint,
  routeOverlay,
}) => {
  const mapRef = useRef(null);
  const fastRouteGeojson = routeOverlay?.fastRoute
    ? {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: routeOverlay.fastRoute.coordinates,
        },
        properties: {},
      }
    : null;

  const safeRouteGeojson = routeOverlay?.safeSegments
    ? {
        type: 'FeatureCollection',
        features: routeOverlay.safeSegments.map((segment, idx) => {
          const coords = routeOverlay.fastRoute.coordinates.slice(
            segment.start_index,
            segment.end_index + 1
          );
          return {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
            properties: {
              label: segment.label,
              score: segment.score,
              lamp_count: segment.lamp_count,
              amenity_count: segment.amenity_count,
              bad_road: segment.bad_road,
              index: idx,
            },
          };
        }),
      }
    : null;
  const MAP_STYLE =
    import.meta.env.VITE_MAP_STYLE_URL ||
    'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
  const poiList = Array.isArray(places)
    ? places.filter((place) => place?.lat && place?.lng)
    : [];

  // --- THE FLY ANIMATION ---
  useEffect(() => {
    if (lat && lng && mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 13,
        pitch: 50, // Tilt for 3D effect
        bearing: 0,
        essential: true, // This animation is considered essential with respect to prefers-reduced-motion
        duration: 2000 // 2 seconds flight time
      });
    }
  }, [lat, lng]); // Triggers whenever lat/lng changes

  useEffect(() => {
    if (focusPoint && focusPoint.lat && focusPoint.lng && mapRef.current) {
      mapRef.current.flyTo({
        center: [focusPoint.lng, focusPoint.lat],
        zoom: focusPoint.zoom || 14,
        pitch: 45,
        duration: 1800,
        essential: true,
      });
    }
  }, [focusPoint]);

  return (
    <div className="h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 relative">
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: lat || 20.5937,
          longitude: lng || 78.9629,
          zoom: 4
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
      >
        <GeolocateControl position="top-left" />
        <NavigationControl position="top-left" />
        {fastRouteGeojson && (
          <Source id="fast-route" type="geojson" data={fastRouteGeojson}>
            <Layer
              id="fast-route-line"
              type="line"
              paint={{
                'line-color': 'rgba(255,0,0,0.45)',
                'line-width': 5,
                'line-dasharray': [1, 1.5],
              }}
            />
          </Source>
        )}
        {safeRouteGeojson && (
          <Source id="safe-route" type="geojson" data={safeRouteGeojson}>
            <Layer
              id="safe-route-line"
              type="line"
              paint={{
                'line-color': [
                  'match',
                  ['get', 'label'],
                  'safe',
                  '#16a34a',
                  'moderate',
                  '#fbbf24',
                  '#ef4444',
                ],
                'line-width': 7,
                'line-opacity': 0.85,
                'line-cap': 'round',
                'line-join': 'round',
              }}
            />
          </Source>
        )}

        {lat && lng && (
          <Marker longitude={lng} latitude={lat} anchor="bottom">
            <div className="flex flex-col items-center">
               <div className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold mb-2 shadow-lg">
                 {cityName}
               </div>
               <MapPin size={40} className="text-blue-500 fill-blue-500/20 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            </div>
          </Marker>
        )}
        {poiList.map((place, index) => (
          <Marker key={`${place.name}-${index}`} longitude={place.lng} latitude={place.lat} anchor="bottom">
            <div className="flex flex-col items-center">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-[10px] font-semibold mb-1 shadow-md">
                {place.name}
              </div>
              <MapPin size={28} className="text-purple-600 fill-purple-400/30" />
            </div>
          </Marker>
        ))}
      </Map>
      {routeOverlay?.summary ? (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white px-4 py-3 rounded-2xl backdrop-blur-md border border-gray-700 text-sm max-w-xs">
          <div className="font-semibold text-green-300 flex items-center gap-2">
            <span>🛡️ Safety Score: {routeOverlay.summary.safety_score}/100</span>
          </div>
          <p className="text-xs text-gray-200 mt-1">
            Lamps: {routeOverlay.summary.total_lamps} · 24/7 spots:{' '}
            {routeOverlay.summary.total_amenities} · Risky segments:{' '}
            {routeOverlay.summary.risky_segments}
          </p>
        </div>
      ) : (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white px-4 py-2 rounded-xl backdrop-blur-md border border-gray-700 text-sm">
          📍 Radius: 20km Active
        </div>
      )}
    </div>
  );
};

export default CityMap;