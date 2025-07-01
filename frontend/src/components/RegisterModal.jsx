// src/components/RegisterModal.jsx
import React from 'react';
import RegisterPage from './RegisterPage';
import { FiX } from 'react-icons/fi';

export default function RegisterModal({ onRegisterSuccess, onSwitchToLogin, onClose, sessionId, onboardingData, onBackToLanding }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="relative">
        <button onClick={onClose} className="absolute -top-2 -right-2 z-10 bg-gray-700 rounded-full p-1 text-white hover:bg-red-500">
          <FiX size={20}/>
        </button>
        <RegisterPage 
          onRegisterSuccess={onRegisterSuccess} 
          onSwitchToLogin={onSwitchToLogin}
          sessionId={sessionId}
          onboardingData={onboardingData}
          onBackToLanding={onBackToLanding}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
