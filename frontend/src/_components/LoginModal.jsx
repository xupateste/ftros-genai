// src/components/LoginModal.jsx
import React from 'react';
import LoginPage from './LoginPage'; // Asumimos que LoginPage ya existe
import { FiX } from 'react-icons/fi';

export default function LoginModal({ onLoginSuccess, onSwitchToRegister, onClose, onBackToAnalysis }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="relative">
        <LoginPage 
          onLoginSuccess={onLoginSuccess} 
          onSwitchToRegister={onSwitchToRegister}
          onBackToAnalysis={onBackToAnalysis}
          onClose={onClose}
          // No pasamos onBackToAnalysis porque estamos en un modal
        />
      </div>
    </div>
  );
}
