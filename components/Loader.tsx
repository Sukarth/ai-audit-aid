
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md border border-slate-200">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-600 font-semibold">AI is analyzing documents...</p>
      <p className="mt-1 text-sm text-slate-500">This will take a while for large texts.</p>
    </div>
  );
};

export default Loader;
