import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginScreen } from './components/screens/LoginScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { ProcessingScreen } from './components/screens/ProcessingScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { LogsScreen } from './components/screens/LogsScreen';
import { Toaster } from './components/ui/sonner';
import { invoke } from "@tauri-apps/api/core";
type AppView = 'login' | 'dashboard' | 'process' | 'settings' | 'logs' | 'help';

export default function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize dark mode from system preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentView('login');
  };

  const handleNavigation = (view: string) => {
    setCurrentView(view as AppView);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen">
        <LoginScreen onLogin={handleLogin} />
        <Toaster />
      </div>
    );
  }

  // Render main application with layout
  return (
    <div className="min-h-screen">
      <div className="flex h-screen bg-background">
        <Sidebar currentView={currentView} onNavigate={handleNavigation} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            darkMode={darkMode} 
            onToggleDarkMode={toggleDarkMode} 
            onLogout={handleLogout} 
          />
          
          <main className="flex-1 overflow-auto">
            {currentView === 'dashboard' && (
              <DashboardScreen onNavigate={handleNavigation} />
            )}
            {currentView === 'process' && (
              <ProcessingScreen onBack={() => handleNavigation('dashboard')} />
            )}
            {currentView === 'settings' && (
              <SettingsScreen onBack={() => handleNavigation('dashboard')} />
            )}
            {currentView === 'logs' && (
              <LogsScreen onBack={() => handleNavigation('dashboard')} />
            )}
            {currentView === 'help' && (
              <div className="p-6">
                <div className="max-w-4xl mx-auto">
                  <h1 className="text-2xl font-medium mb-4">Help & Support</h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-card p-6 rounded-lg border">
                      <h3 className="text-lg font-medium mb-2">📚 Documentation</h3>
                      <p className="text-muted-foreground mb-4">
                        Comprehensive guides and API references for CipherShield Pro.
                      </p>
                      <button className="text-primary hover:underline">View Documentation →</button>
                    </div>
                    <div className="bg-card p-6 rounded-lg border">
                      <h3 className="text-lg font-medium mb-2">💬 Support Chat</h3>
                      <p className="text-muted-foreground mb-4">
                        Get instant help from our technical support team.
                      </p>
                      <button className="text-primary hover:underline">Start Chat →</button>
                    </div>
                    <div className="bg-card p-6 rounded-lg border">
                      <h3 className="text-lg font-medium mb-2">🎓 Training</h3>
                      <p className="text-muted-foreground mb-4">
                        Interactive tutorials and best practices for PII protection.
                      </p>
                      <button className="text-primary hover:underline">Start Training →</button>
                    </div>
                    <div className="bg-card p-6 rounded-lg border">
                      <h3 className="text-lg font-medium mb-2">📞 Contact Us</h3>
                      <p className="text-muted-foreground mb-4">
                        Reach out to our enterprise support team for assistance.
                      </p>
                      <button className="text-primary hover:underline">Contact Support →</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}