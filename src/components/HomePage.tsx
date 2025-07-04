// src/components/HomePage.tsx
import React from 'react';
import { FileText } from 'lucide-react';

interface HomePageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <div className="container mx-auto px-4 py-16 flex-grow">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <FileText className="h-16 w-16 text-blue-600 mr-4" />
            <h1 className="text-5xl font-bold text-gray-900">DocuSign Pro</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mt-4">
            The simplest way to sign documents online. Secure, fast, and legally binding.
          </p>
        </div>

        {/* Main content */}
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden md:flex">
          <div className="md:w-1/2 bg-blue-600 text-white p-8">
            <h2 className="text-2xl font-semibold mb-4">Document Signing Made Easy</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Upload PDF documents</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Sign with digital signatures</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Download signed documents</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Manage all your documents</span>
              </li>
            </ul>
          </div>
          <div className="p-8 md:w-1/2">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Get Started</h2>
            <p className="text-gray-600 mb-6">
              Sign up for free and start signing documents in seconds.
            </p>
            <div className="space-y-4">
              <button 
                onClick={onRegister}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Create Account
              </button>
              <button 
                onClick={onLogin}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} DocuSign Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;