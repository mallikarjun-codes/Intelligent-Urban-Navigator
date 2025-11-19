import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Sparkles, Shield, Zap, Globe, Code, Users, Target } from 'lucide-react';

const About = () => {
  const features = [
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: "AI-Powered Insights",
      description: "Get intelligent recommendations and answers about your city using advanced AI technology."
    },
    {
      icon: <MapPin className="h-8 w-8" />,
      title: "Location Intelligence",
      description: "Discover popular places, hidden gems, and must-visit locations in your city."
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Safety Scoring",
      description: "Real-time safety analysis based on street lighting, amenities, and infrastructure data."
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Route Planning",
      description: "Get optimized routes with safety analysis and real-time navigation assistance."
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Global Coverage",
      description: "Works in cities worldwide with support for multiple languages and regions."
    },
    {
      icon: <Code className="h-8 w-8" />,
      title: "Open Source",
      description: "Built with modern technologies and open-source principles for transparency."
    }
  ];

  const techStack = [
    "React.js", "Vite", "Tailwind CSS", "Framer Motion", "Flask", "Python",
    "Google Gemini AI", "OpenStreetMap", "MapLibre GL", "Axios", "React Router"
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Background Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/40 via-indigo-400/30 to-purple-400/20 dark:from-blue-500/20 dark:via-indigo-500/15 dark:to-purple-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute top-20 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/40 via-pink-400/30 to-blue-400/20 dark:from-purple-500/20 dark:via-pink-500/15 dark:to-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-72 h-72 bg-gradient-to-br from-indigo-400/30 via-blue-400/20 to-cyan-400/20 dark:from-indigo-500/15 dark:via-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '6s' }} />

      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              About Know Your City
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mt-4">
            Empowering urban exploration through intelligent navigation and AI-driven insights
          </p>
        </motion.div>

        {/* Mission Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-12 border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-start gap-4 mb-6">
            <Target className="h-10 w-10 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Our Mission</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                Know Your City is designed to transform how people explore and interact with urban environments. 
                We combine cutting-edge AI technology with comprehensive location data to provide users with 
                intelligent, personalized recommendations and safety insights. Our platform helps users discover 
                hidden gems, navigate safely, and make informed decisions about their urban adventures.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all"
              >
                <div className="text-blue-600 dark:text-blue-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Technology Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-12 border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-start gap-4 mb-6">
            <Code className="h-10 w-10 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Technology Stack</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Built with modern, scalable technologies to ensure optimal performance and user experience.
              </p>
              <div className="flex flex-wrap gap-3">
                {techStack.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-700"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Team Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-start gap-4">
            <Users className="h-10 w-10 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Our Team</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg mb-4">
                Know Your City is developed by a passionate team of software engineers, data scientists, 
                and UX designers dedicated to creating innovative solutions for urban navigation. We believe 
                in the power of technology to enhance human experiences and make cities more accessible and 
                enjoyable for everyone.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                Our commitment to excellence drives us to continuously improve our platform, incorporating 
                user feedback and the latest technological advancements to deliver the best possible experience.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;

