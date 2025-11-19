import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, History, MapPin, Sparkles, Shield, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFavoritePlaces, getSearchHistory } from '../utils/userData';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, openAuthModal } = useAuth();
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (user?.id) {
      setHistory(getSearchHistory(user.id));
      setFavorites(getFavoritePlaces(user.id));
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-10 text-center max-w-xl">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Personalized Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Sign in to view your search history, saved places, and personalized insights.
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
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/40 via-indigo-400/30 to-purple-400/20 dark:from-blue-500/20 dark:via-indigo-500/15 dark:to-purple-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute top-20 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/40 via-pink-400/30 to-blue-400/20 dark:from-purple-500/20 dark:via-pink-500/15 dark:to-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      <div className="container mx-auto px-6 py-12 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <p className="text-sm uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">
            Welcome back
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100">
            {user.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-4 max-w-2xl">
            This dashboard captures your recent searches, favorite places, and smart tips to help you explore smarter.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 flex items-start gap-4"
          >
            <History className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Searches</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {history.length > 0 ? `${history.length} queries tracked` : 'No searches yet'}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 flex items-start gap-4"
          >
            <Bookmark className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Saved Places</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {favorites.length > 0 ? `${favorites.length} favorites saved` : 'No favorites yet'}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 flex items-start gap-4"
          >
            <Shield className="h-10 w-10 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Safety Insights</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track safety scores for your pinned neighborhoods.
              </p>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Search History</h2>
              </div>
              <Link
                to="/"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Make a new query
              </Link>
            </div>
            {history.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Start exploring! Your recent searches will appear here.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {history.map((entry, idx) => (
                  <div key={`${entry.query}-${idx}`} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 bg-blue-500 rounded-full" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{entry.query}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Bookmark className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Saved Places</h2>
              </div>
              <Link
                to="/places"
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                Browse places
              </Link>
            </div>
            {favorites.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Save places from the Places page or AI recommendations.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {favorites.map((place, idx) => (
                  <div key={`${place.name}-${idx}`} className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium">
                      <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      {place.name}
                    </div>
                    {place.address && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{place.address}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Saved {new Date(place.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Smart Notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Soon you’ll receive personalized alerts for weather changes, event highlights, and safety updates around your saved areas.
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              {['Weather alerts', 'Event drops', 'Safety updates', 'Curated tips'].map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <Bell className="h-12 w-12" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;

