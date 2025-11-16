import React from 'react';
import { AuditComparison } from '../services/comparisonService';
import { NonConformity } from '../types';

interface AuditComparisonProps {
    comparison: AuditComparison;
    onClose: () => void;
}

export const AuditComparisonComponent: React.FC<AuditComparisonProps> = ({ comparison, onClose }) => {
    const { statistics, changes, audit1, audit2 } = comparison;

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'High':
                return 'text-red-600 bg-red-100';
            case 'Medium':
                return 'text-yellow-600 bg-yellow-100';
            case 'Low':
                return 'text-blue-600 bg-blue-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const getProgressColor = (progress: string) => {
        switch (progress) {
            case 'improved':
                return 'text-green-600 bg-green-100';
            case 'declined':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const renderNonConformity = (nc: NonConformity, showBadge?: string, badgeColor?: string) => (
        <div key={`${nc.regulationClause}-${nc.manualReference}`} className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(nc.severity)}`}>
                            {nc.severity}
                        </span>
                        {showBadge && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${badgeColor}`}>
                                {showBadge}
                            </span>
                        )}
                    </div>
                    <h4 className="font-semibold text-slate-800">{nc.regulationClause}</h4>
                    <p className="text-sm text-slate-600 mt-1">{nc.finding}</p>
                </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">
                <span className="font-medium">Manual Reference:</span> {nc.manualReference}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Audit Comparison</h2>
                            <p className="text-sm text-slate-600 mt-1">Track remediation progress between two audits</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Close comparison"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Statistics Overview */}
                <div className="p-6 bg-slate-50 border-b border-slate-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="text-2xl font-bold text-slate-800">{audit1.nonConformities.length}</div>
                            <div className="text-sm text-slate-600">Audit 1 Issues</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="text-2xl font-bold text-slate-800">{audit2.nonConformities.length}</div>
                            <div className="text-sm text-slate-600">Audit 2 Issues</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className={`text-2xl font-bold ${statistics.complianceImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {statistics.complianceImprovement >= 0 ? '+' : ''}{statistics.complianceImprovement}%
                            </div>
                            <div className="text-sm text-slate-600">Improvement</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className={`text-lg font-bold px-3 py-1 rounded inline-block ${getProgressColor(statistics.overallProgress)}`}>
                                {statistics.overallProgress.toUpperCase()}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">Overall</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-lg font-semibold text-green-700">{statistics.totalIssuesRemoved}</div>
                            <div className="text-xs text-green-600">Resolved ✅</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                            <div className="text-lg font-semibold text-red-700">{statistics.totalIssuesAdded}</div>
                            <div className="text-xs text-red-600">New Issues ⚠️</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3">
                            <div className="text-lg font-semibold text-orange-700">{statistics.severityUpgrades}</div>
                            <div className="text-xs text-orange-600">Upgrades ⬆️</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-lg font-semibold text-blue-700">{statistics.severityDowngrades}</div>
                            <div className="text-xs text-blue-600">Downgrades ⬇️</div>
                        </div>
                    </div>
                </div>

                {/* Changes Details */}
                <div className="p-6">
                    {/* Resolved Issues */}
                    {changes.resolvedNonConformities.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                                <span className="text-2xl">✅</span>
                                Resolved Issues ({changes.resolvedNonConformities.length})
                            </h3>
                            <div className="space-y-3">
                                {changes.resolvedNonConformities.map((nc) =>
                                    renderNonConformity(nc, '✅ Resolved', 'text-green-700 bg-green-100')
                                )}
                            </div>
                        </div>
                    )}

                    {/* New Issues */}
                    {changes.newNonConformities.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                                <span className="text-2xl">⚠️</span>
                                New Issues ({changes.newNonConformities.length})
                            </h3>
                            <div className="space-y-3">
                                {changes.newNonConformities.map((nc) =>
                                    renderNonConformity(nc, '⚠️ New', 'text-red-700 bg-red-100')
                                )}
                            </div>
                        </div>
                    )}

                    {/* Severity Changes */}
                    {changes.changedSeverity.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-orange-700 mb-4 flex items-center gap-2">
                                <span className="text-2xl">🔄</span>
                                Severity Changes ({changes.changedSeverity.length})
                            </h3>
                            <div className="space-y-3">
                                {changes.changedSeverity.map((change, idx) => (
                                    <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-white">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-sm font-medium text-slate-500 mb-2">Before (Audit 1)</div>
                                                {renderNonConformity(change.before)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-500 mb-2">After (Audit 2)</div>
                                                {renderNonConformity(change.after, change.change === 'upgraded' ? '⬆️ Upgraded' : '⬇️ Downgraded', change.change === 'upgraded' ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Unchanged Issues */}
                    {changes.unchangedNonConformities.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <span className="text-2xl">➡️</span>
                                Unchanged Issues ({changes.unchangedNonConformities.length})
                            </h3>
                            <div className="space-y-3">
                                {changes.unchangedNonConformities.map((nc) =>
                                    renderNonConformity(nc, '➡️ Unchanged', 'text-slate-700 bg-slate-100')
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-800 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                    >
                        Close Comparison
                    </button>
                </div>
            </div>
        </div>
    );
};
