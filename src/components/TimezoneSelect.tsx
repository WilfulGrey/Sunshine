import React, { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { useTimezone } from '../contexts/TimezoneContext';

const TIMEZONES = [
  { value: 'Europe/Warsaw', label: 'Warsaw (CEST/CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CEST/CET)' },
  { value: 'Europe/London', label: 'London (BST/GMT)' },
  { value: 'America/New_York', label: 'New York (EDT/EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PDT/PST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'UTC', label: 'UTC' }
];

export const TimezoneSelect: React.FC = () => {
  const { timezone, setTimezone, getTimezoneDisplay } = useTimezone();
  const [isOpen, setIsOpen] = useState(false);

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    setIsOpen(false);
  };

  const currentTimezoneLabel = TIMEZONES.find(tz => tz.value === timezone)?.label || timezone;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white/20 rounded-lg text-white/90 hover:bg-white/30 transition-colors"
      >
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">{getTimezoneDisplay()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">Wybierz strefę czasową</p>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {TIMEZONES.map((tz) => (
                <button
                  key={tz.value}
                  onClick={() => handleTimezoneChange(tz.value)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    timezone === tz.value ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{tz.label}</span>
                    {timezone === tz.value && (
                      <div className="w-2 h-2 bg-purple-600 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};