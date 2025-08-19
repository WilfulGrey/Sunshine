import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  getTimezoneDisplay: () => string;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

interface TimezoneProviderProps {
  children: ReactNode;
}

export const TimezoneProvider: React.FC<TimezoneProviderProps> = ({ children }) => {
  const [timezone, setTimezoneState] = useState<string>(() => {
    // Load from localStorage or default to Europe/Warsaw
    return localStorage.getItem('selected_timezone') || 'Europe/Warsaw';
  });

  const setTimezone = (newTimezone: string) => {
    setTimezoneState(newTimezone);
    localStorage.setItem('selected_timezone', newTimezone);
  };

  const getTimezoneDisplay = (): string => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(now);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || timezone;
    
    // Get current time in selected timezone
    const timeFormatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const currentTime = timeFormatter.format(now);
    
    return `${timeZoneName} ${currentTime}`;
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, getTimezoneDisplay }}>
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};