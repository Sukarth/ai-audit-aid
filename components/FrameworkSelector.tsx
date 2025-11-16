import React, { useState, useEffect } from 'react';
import { FrameworkService, FrameworkConfig, RegulatoryFramework } from '../services/frameworkService';

interface FrameworkSelectorProps {
    onFrameworkChange?: (framework: RegulatoryFramework) => void;
}

export const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({ onFrameworkChange }) => {
    const [selectedFramework, setSelectedFramework] = useState<RegulatoryFramework>(
        FrameworkService.getSelectedFramework()
    );
    const [showDropdown, setShowDropdown] = useState(false);

    const frameworks = FrameworkService.getAllFrameworks();
    const currentConfig = FrameworkService.getFrameworkConfig(selectedFramework);

    const handleSelect = (framework: RegulatoryFramework) => {
        setSelectedFramework(framework);
        FrameworkService.setSelectedFramework(framework);
        setShowDropdown(false);
        onFrameworkChange?.(framework);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 shadow-sm"
            >
                <span className="text-lg">{currentConfig.icon}</span>
                <span>{currentConfig.name}</span>
                <svg
                    className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDropdown(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-slate-300 rounded-lg shadow-xl z-20 overflow-hidden">
                        {frameworks.map((framework) => (
                            <button
                                key={framework.id}
                                onClick={() => handleSelect(framework.id)}
                                className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${framework.id === selectedFramework ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{framework.icon}</span>
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-800">{framework.name}</div>
                                        <div className="text-xs text-slate-600 mt-1">{framework.description}</div>
                                    </div>
                                    {framework.id === selectedFramework && (
                                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
