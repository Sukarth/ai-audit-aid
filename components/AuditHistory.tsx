import React, { useState, useEffect } from 'react';
import { HistoryService, StoredAudit } from '../services/historyService';
import { AuditComparison } from '../services/comparisonService';

interface AuditHistoryProps {
    onSelectAudit?: (audit: StoredAudit) => void;
    onCompareAudits?: (audit1: StoredAudit, audit2: StoredAudit) => void;
    onClose: () => void;
}

export const AuditHistory: React.FC<AuditHistoryProps> = ({ onSelectAudit, onCompareAudits, onClose }) => {
    const [allHistory, setAllHistory] = useState<StoredAudit[]>([]);
    const [filteredHistory, setFilteredHistory] = useState<StoredAudit[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAudits, setSelectedAudits] = useState<Set<string>>(new Set());
    const [stats, setStats] = useState(HistoryService.getStatistics());

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = () => {
        const data = HistoryService.getHistory();
        setAllHistory(data);
        setFilteredHistory(data);
        setStats(HistoryService.getStatistics());
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setFilteredHistory(allHistory);
        } else {
            const results = HistoryService.searchHistory(query);
            setFilteredHistory(results);
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this audit?')) {
            HistoryService.deleteAudit(id);
            loadHistory();
            setSelectedAudits(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleClearAll = () => {
        if (window.confirm('Are you sure you want to clear all audit history? This cannot be undone.')) {
            HistoryService.clearHistory();
            loadHistory();
            setSelectedAudits(new Set());
        }
    };

    const handleExport = () => {
        const json = HistoryService.exportHistory();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit_history_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (HistoryService.importHistory(content)) {
                alert('History imported successfully!');
                loadHistory();
            } else {
                alert('Failed to import history. Please check the file format.');
            }
        };
        reader.readAsText(file);
    };

    const toggleAuditSelection = (id: string) => {
        setSelectedAudits(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                // Limit to 2 selections for comparison
                if (next.size >= 2) {
                    const firstId = Array.from(next)[0];
                    next.delete(firstId);
                }
                next.add(id);
            }
            return next;
        });
    };

    const handleCompare = () => {
        if (selectedAudits.size === 2 && onCompareAudits) {
            const ids = Array.from(selectedAudits);
            const audit1 = HistoryService.getAuditById(ids[0] as string);
            const audit2 = HistoryService.getAuditById(ids[1] as string);
            if (audit1 && audit2) {
                onCompareAudits(audit1, audit2);
            }
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getSeverityColor = (count: number, total: number) => {
        const ratio = count / total;
        if (ratio > 0.5) return 'text-red-600';
        if (ratio > 0.2) return 'text-yellow-600';
        return 'text-blue-600';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Audit History</h2>
                            <p className="text-sm text-slate-600 mt-1">{stats.totalAudits} audits stored</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Close history"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Statistics */}
                    {stats.totalAudits > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-slate-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-slate-800">{stats.totalAudits}</div>
                                <div className="text-xs text-slate-600">Total Audits</div>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-slate-800">{stats.averageNonConformities}</div>
                                <div className="text-xs text-slate-600">Avg Issues</div>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                                <div className="text-lg font-bold text-slate-800">{stats.mostCommonSeverity || 'N/A'}</div>
                                <div className="text-xs text-slate-600">Most Common Severity Level</div>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                                <div className="text-lg font-bold text-slate-800">
                                    {stats.newestAudit ? formatDate(stats.newestAudit).split(',')[0] : 'N/A'}
                                </div>
                                <div className="text-xs text-slate-600">Latest Audit</div>
                            </div>
                        </div>
                    )}

                    {/* Search and Actions */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="text"
                            placeholder="Search by organization, audit name, or document..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleExport}
                                disabled={allHistory.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                Export
                            </button>
                            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm">
                                Import
                                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                            </label>
                            <button
                                onClick={handleClearAll}
                                disabled={allHistory.length === 0}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    {/* Compare Button */}
                    {selectedAudits.size === 2 && (
                        <button
                            onClick={handleCompare}
                            className="w-full mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                            Compare Selected Audits
                        </button>
                    )}
                </div>

                {/* Audit List */}
                <div className="p-6">
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-slate-600">
                                {searchQuery ? 'No audits match your search' : 'No audit history found'}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                {searchQuery ? 'Try a different search term' : 'Run an audit to see it here'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredHistory.map((audit) => {
                                const isSelected = selectedAudits.has(audit.id);
                                const severityCounts = { High: 0, Medium: 0, Low: 0 };
                                audit.result.nonConformities.forEach(nc => {
                                    severityCounts[nc.severity]++;
                                });

                                return (
                                    <div
                                        key={audit.id}
                                        className={`border rounded-lg p-4 transition-all ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3 flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleAuditSelection(audit.id)}
                                                    className="mt-1 w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-slate-800">
                                                            {audit.auditName || audit.organizationName || 'Untitled Audit'}
                                                        </h3>
                                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                                                            {audit.result.nonConformities.length} issues
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-2">{formatDate(audit.timestamp)}</p>
                                                    {(audit.regulationName || audit.manualName) && (
                                                        <p className="text-xs text-slate-500">
                                                            {audit.regulationName && <span>Regulation: {audit.regulationName}</span>}
                                                            {audit.regulationName && audit.manualName && <span> • </span>}
                                                            {audit.manualName && <span>Manual: {audit.manualName}</span>}
                                                        </p>
                                                    )}
                                                    <div className="flex gap-2 mt-2">
                                                        {severityCounts.High > 0 && (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                                                {severityCounts.High} High
                                                            </span>
                                                        )}
                                                        {severityCounts.Medium > 0 && (
                                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                                                                {severityCounts.Medium} Medium
                                                            </span>
                                                        )}
                                                        {severityCounts.Low > 0 && (
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                                                {severityCounts.Low} Low
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {onSelectAudit && (
                                                    <button
                                                        onClick={() => onSelectAudit(audit)}
                                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                                    >
                                                        View
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(audit.id)}
                                                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
