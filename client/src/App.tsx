import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatInterface from './components/ChatInterface';
import BackendManager from './components/BackendManager';
import AdminAuthGate from './components/AdminAuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [authorized, setAuthorized] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [adminAuthorized, setAdminAuthorized] = useState(false);

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(window.location.pathname);
    };
    
    window.addEventListener('popstate', handleLocationChange);
    const interval = setInterval(handleLocationChange, 500);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, []);

  const handleAuthorized = (name: string, role: string) => {
    setUserName(name || 'Security Officer');
    setUserRole(role || 'Security Officer');
    setAuthorized(true);
  };

  if (route === '/backend.aspx' || route === '/backend' || route === '/admin') {
    return (
      <ErrorBoundary>
        <div className="matrix-bg min-h-screen flex flex-col items-center justify-center p-4">
          <div className="w-full flex-grow flex items-center justify-center">
            {!adminAuthorized ? (
              <AdminAuthGate onAuthorized={() => setAdminAuthorized(true)} />
            ) : (
              <BackendManager />
            )}
          </div>
          <footer className="w-full text-center py-2 font-mono text-[10px] text-red-600/70 tracking-wider">
            © 2026 MesxlitySolutions (Rabih Rizkallah). All Rights Reserved.
          </footer>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="matrix-bg min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full flex-grow flex items-center justify-center">
          {!authorized ? (
            <LoginScreen onAuthorized={handleAuthorized} />
          ) : (
            <ChatInterface userName={userName || 'Security Officer'} userRole={userRole || 'Security Officer'} />
          )}
        </div>
        <footer className="w-full text-center py-2 font-mono text-[10px] text-red-600/70 tracking-wider">
          © 2026 MesxlitySolutions (Rabih Rizkallah). All Rights Reserved.
        </footer>
      </div>
    </ErrorBoundary>
  );
}