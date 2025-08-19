import React, { useState } from 'react';
import { Phone, Eye, EyeOff, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { twilioService } from '../services/twilioService';

interface TwilioConfigProps {
  onConfigSaved: () => void;
}

export const TwilioConfig: React.FC<TwilioConfigProps> = ({ onConfigSaved }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [config, setConfig] = useState({
    accountSid: localStorage.getItem('twilio_account_sid') || import.meta.env.VITE_TWILIO_ACCOUNT_SID || '',
    authToken: localStorage.getItem('twilio_auth_token') || import.meta.env.VITE_TWILIO_AUTH_TOKEN || '',
    phoneNumber: localStorage.getItem('twilio_phone_number') || import.meta.env.VITE_TWILIO_PHONE_NUMBER || ''
  });
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleSave = () => {
    // Save configuration
    twilioService.updateConfig(config);
    
    setShowConfig(false);
    onConfigSaved();
  };

  const testConnection = async () => {
    try {
      // Test API connection by fetching calls list
      await twilioService.getCalls();
      
      setTestResult('success');
      
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      console.error('Test connection failed:', error);
      setTestResult('error');
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const isConfigured = config.accountSid && config.authToken && config.phoneNumber;

  return (
    <div className="relative">
      <button
        onClick={() => setShowConfig(!showConfig)}
        className={`p-2 rounded-lg transition-colors ${
          isConfigured 
            ? 'text-green-600 bg-green-100 hover:bg-green-200' 
            : 'text-gray-400 bg-gray-100 hover:bg-gray-200'
        }`}
        title="Konfiguracja Twilio"
      >
        <Phone className="h-5 w-5" />
      </button>

      {showConfig && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Konfiguracja Twilio</h3>
              <a
                href="https://console.twilio.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account SID *
                </label>
                <input
                  type="text"
                  value={config.accountSid}
                  onChange={(e) => setConfig(prev => ({ ...prev, accountSid: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Znajdź w: Console → Account Info → Account SID
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auth Token *
                </label>
                <div className="relative">
                  <input
                    type={showAuthToken ? 'text' : 'password'}
                    value={config.authToken}
                    onChange={(e) => setConfig(prev => ({ ...prev, authToken: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="your_auth_token_here"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthToken(!showAuthToken)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Znajdź w: Console → Account Info → Auth Token
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numer telefonu Twilio *
                </label>
                <input
                  type="text"
                  value={config.phoneNumber}
                  onChange={(e) => setConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="+1234567890"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Znajdź w: Console → Phone Numbers → Manage → Active numbers
                </p>
              </div>

              {testResult && (
                <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                  testResult === 'success' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {testResult === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {testResult === 'success' 
                      ? 'Konfiguracja Twilio działa!' 
                      : 'Błąd konfiguracji Twilio'
                    }
                  </span>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs">ℹ️</span>
                  </div>
                  <div className="text-xs text-blue-800">
                    <p className="font-medium mb-1">Jak działa połączenie 3-way:</p>
                    <p>1. Twilio dzwoni do klienta</p>
                    <p>2. Twilio dzwoni do Ciebie na Twój telefon</p>
                    <p>3. Oba połączenia łączą się w konferencji</p>
                    <p className="mt-2 font-medium">📱 Wymagania:</p>
                    <p>Twój numer telefonu (zostaniesz o niego zapytany przy pierwszym połączeniu)</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={testConnection}
                  disabled={!config.accountSid || !config.authToken || !config.phoneNumber}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Testuj połączenie
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowConfig(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!config.accountSid || !config.authToken || !config.phoneNumber}
                    className="px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#AB4D95' }}
                    onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#9A3D85')}
                    onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#AB4D95')}
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};