
import React from 'react';
import Header from './components/Header';
import AuditDashboard from './components/AuditDashboard';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        <AuditDashboard />
      </main>
      <footer className="text-center p-4 text-xs text-slate-500">
        <p>
          © 2025 <a href="https://github.com/sukarth" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">Sukarth A</a>
        </p>
        <p>Built for Traficom @ Junction</p>
      </footer>
    </div>
  );
};

export default App;
