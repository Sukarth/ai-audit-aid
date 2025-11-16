
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
            <div>
                 <h1 className="text-2xl font-bold text-slate-900">AI Audit Aid (AAA)</h1>
            <p className="text-sm text-slate-500">Efficient Audits with AI</p>
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-semibold">Junction 2025</span>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
