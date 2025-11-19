import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  
  return (
    <header className="bg-white/70 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <MapPin className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Know Your City
          </span>
        </Link>
        <div className="hidden md:flex items-center space-x-6 font-medium">
          <Link 
            to="/" 
            className={`transition ${location.pathname === '/' ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'}`}
          >
            Home
          </Link>
          <Link 
            to="/places" 
            className={`transition ${location.pathname === '/places' ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'}`}
          >
            Places
          </Link>
          <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:scale-105 transition">
            Login
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;