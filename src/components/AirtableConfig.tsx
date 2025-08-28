import React, { useState } from 'react';
import { Settings, Eye, EyeOff, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { airtableService } from '../services/airtableService';

interface AirtableConfigProps {
  onConfigSaved: () => void;
}

export const AirtableConfig: React.FC<AirtableConfigProps> = ({ onConfigSaved }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState({
    apiKey: localStorage.getItem('airtable_api_key') || import.meta.env.VITE_AIRTABLE_API_KEY || '',
    baseId: localStorage.getItem('airtable_base_id') || import.meta.env.VITE_AIRTABLE_BASE_ID || '',
    tableId: localStorage.getItem('airtable_table_id') || import.meta.env.VITE_AIRTABLE_TABLE_ID || 'tblm5BBDM1qZS40sM'
  });
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleSave = () => {
    // Zapisz w localStorage (w produkcji użyj bezpieczniejszego sposobu)
    localStorage.setItem('airtable_api_key', config.apiKey);
    localStorage.setItem('airtable_base_id', config.baseId);
    localStorage.setItem('airtable_table_id', config.tableId);
    
    // Zaktualizuj konfigurację w serwisie Airtable
    airtableService.updateConfig(config);
    
    setShowConfig(false);
    onConfigSaved();
  };

  const testConnection = async () => {
    try {
      // Use shared singleton instead of creating new instance
      airtableService.updateConfig(config);
      
      await airtableService.getContacts();
      setTestResult('success');
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      console.error('Test connection failed:', error);
      setTestResult('error');
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const isConfigured = config.apiKey && config.baseId && config.tableId;

  return (
    <div className="relative">
      <button
        onClick={() => setShowConfig(!showConfig)}
        className={`p-2 rounded-lg transition-colors ${
          isConfigured 
            ? 'text-green-600 bg-green-100 hover:bg-green-200' 
            : 'text-gray-400 bg-gray-100 hover:bg-gray-200'
        }`}
        title="Konfiguracja Airtable"
      >
        <Settings className="h-5 w-5" />
      </button>

      {showConfig && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Konfiguracja Airtable</h3>
              <a
                href="https://airtable.com/developers/web/api/introduction"
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
                  API Key *
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="patXXXXXXXXXXXXXX.XXXXXXXXXX"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Znajdź w: Account → Developer Hub → Personal Access Tokens
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base ID *
                </label>
                <input
                  type="text"
                  value={config.baseId}
                  onChange={(e) => setConfig(prev => ({ ...prev, baseId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="appXXXXXXXXXXXXXX"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Znajdź w URL bazy: airtable.com/appXXXXXXXXXXXXXX
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table ID *
                </label>
                <input
                  type="text"
                  value={config.tableId}
                  onChange={(e) => setConfig(prev => ({ ...prev, tableId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="tblXXXXXXXXXXXXXX"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Znajdź w API dokumentacji tabeli lub w URL widoku tabeli
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
                      ? 'Połączenie z Airtable działa!' 
                      : 'Błąd połączenia z Airtable'
                    }
                  </span>
                </div>
              )}

              <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={testConnection}
                  disabled={!config.apiKey || !config.baseId || !config.tableId}
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
                    disabled={!config.apiKey || !config.baseId || !config.tableId}
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