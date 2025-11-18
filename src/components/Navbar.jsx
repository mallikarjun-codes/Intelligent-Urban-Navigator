import React from 'react';
import { MapPin } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="bg-white/70 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MapPin className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Know Your City
          </span>
        </div>
        <div className="hidden md:flex items-center space-x-6 font-medium">
          <a href="#" className="text-gray-600 hover:text-blue-600 transition">Home</a>
          <a href="#" className="text-gray-600 hover:text-blue-600 transition">Places</a>
          <a href="#" className="text-gray-600 hover:text-blue-600 transition">Events</a>
          <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:scale-105 transition">
            Login
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;