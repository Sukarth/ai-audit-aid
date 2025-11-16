import React, { useState } from 'react';
import { AuditResult, NonConformity, VersionChangeFinding, SectionAnalysis } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

type Tab = 'summary' | 'non-conformities' | 'questions' | 'version-analysis' | 'section-analysis';

const SeverityBadge: React.FC<{ severity: NonConformity['severity'] }> = ({ severity }) => {
  const baseClasses = 'px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block';
  const colorClasses = {
    High: 'bg-red-100 text-red-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-blue-100 text-blue-800',
  };
  return <span className={`${baseClasses} ${colorClasses[severity]}`}>{severity}</span>;
};

const StatusBadge: React.FC<{ status: SectionAnalysis['status'] }> = ({ status }) => {
  const baseClasses = 'px-2 py-0.5 text-xs font-medium rounded-full inline-flex items-center';
  const styles = {
    'Compliant': { icon: <CheckCircleIcon className="w-3 h-3 mr-1" />, classes: 'bg-green-100 text-green-800' },
    'Non-Compliant': { icon: <XCircleIcon className="w-3 h-3 mr-1" />, classes: 'bg-red-100 text-red-800' },
    'Partial': { icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v5a1 1 0 102 0V7z" clipRule="evenodd" /></svg>, classes: 'bg-yellow-100 text-yellow-800' },
    'Not Covered': { icon: <QuestionMarkCircleIcon className="w-3 h-3 mr-1" />, classes: 'bg-slate-100 text-slate-800' }
  };
  const { icon, classes } = styles[status] || styles['Not Covered'];
  return <span className={`${baseClasses} ${classes}`}>{icon} {status}</span>;
}


const ResultsDisplay: React.FC<{ results: AuditResult }> = ({ results }) => {
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportToCSV = () => {
    const headers = ['Severity', 'Regulation Clause', 'Finding', 'Recommendation', 'Manual Reference', 'Regulation Text'];
    const rows = results.nonConformities.map(nc => [
      nc.severity,
      nc.regulationClause,
      `"${nc.finding.replace(/"/g, '""')}"`,
      `"${nc.recommendation.replace(/"/g, '""')}"`,
      `"${nc.manualReference.replace(/"/g, '""')}"`,
      `"${nc.regulationText.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "audit_non_conformities.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const exportToJSON = () => {
    const json = JSON.stringify(results, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_results_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    // Create a printable HTML version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Audit Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          h1 { color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #334155; margin-top: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
          h3 { color: #475569; margin-top: 20px; }
          .summary { background: #f8fafc; padding: 15px; border: 2px solid #3b82f6; margin: 20px 0; }
          .severity-high { color: #dc2626; font-weight: bold; }
          .severity-medium { color: #d97706; font-weight: bold; }
          .severity-low { color: #2563eb; font-weight: bold; }
          .finding { background: #fef3c7; padding: 10px; margin: 10px 0; border-radius: 4px; }
          .recommendation { background: #dbeafe; padding: 10px; margin: 10px 0; border-radius: 4px; }
          .section { margin: 20px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 10px; text-align: left; border: 1px solid #e2e8f0; }
          th { background: #f1f5f9; font-weight: bold; }
          @media print { 
            body { margin: 0; }
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <h1>Compliance Audit Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        
        <h2>Executive Summary</h2>
        <div class="summary">${results.summary}</div>
        
        <div class="page-break"></div>
        
        <h2>Non-Conformities (${results.nonConformities.length})</h2>
        ${results.nonConformities.map((nc, i) => `
          <div class="section">
            <h3>${i + 1}. ${nc.regulationClause} <span class="severity-${nc.severity.toLowerCase()}">[${nc.severity}]</span></h3>
            <div class="finding"><strong>Finding:</strong> ${nc.finding}</div>
            <div class="recommendation"><strong>Recommendation:</strong> ${nc.recommendation}</div>
            <p><strong>Manual Reference:</strong> ${nc.manualReference}</p>
            <p><strong>Regulation Text:</strong> ${nc.regulationText}</p>
          </div>
        `).join('')}
        
        ${results.sectionAnalysis && results.sectionAnalysis.length > 0 ? `
          <div class="page-break"></div>
          <h2>Section Analysis</h2>
          <table>
            <thead>
              <tr>
                <th>Section</th>
                <th>Status</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              ${results.sectionAnalysis.map(section => `
                <tr>
                  <td>${section.moeSection}</td>
                  <td>${section.status}</td>
                  <td>${section.summary}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        
        ${results.questions && results.questions.length > 0 ? `
          <div class="page-break"></div>
          <h2>Questions for Human Auditor (${results.questions.length})</h2>
          ${results.questions.map((q, i) => `
            <div class="section">
              <h3>${i + 1}. ${q.regulationClause}</h3>
              <p><strong>Question:</strong> ${q.question}</p>
              <p><strong>Reasoning:</strong> ${q.reasoning}</p>
            </div>
          `).join('')}
        ` : ''}
        
        ${results.versionChangeAnalysis && results.versionChangeAnalysis.length > 0 ? `
          <div class="page-break"></div>
          <h2>Version Change Analysis (${results.versionChangeAnalysis.length})</h2>
          ${results.versionChangeAnalysis.map((change, i) => `
            <div class="section">
              <h3>${i + 1}. ${change.clause}</h3>
              <p><strong>Change Summary:</strong> ${change.summaryOfChange}</p>
              <p><strong>Manual Coverage:</strong> ${change.manualCoverage}</p>
              <div class="recommendation"><strong>Recommendation:</strong> ${change.recommendation}</div>
            </div>
          `).join('')}
        ` : ''}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
    setShowExportMenu(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <div className="p-6 prose prose-slate max-w-none">
            <p>{results.summary}</p>
          </div>
        );
      case 'non-conformities':
        return (
          <div className="space-y-4 p-4 sm:p-6">
            {results.nonConformities.length > 0 ? (
              results.nonConformities.map((item, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800 text-lg">
                      <XCircleIcon className="w-6 h-6 text-red-500 inline-block mr-2" />
                      {item.regulationClause}
                    </h4>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <p className="text-slate-600 mb-2"><strong className="font-semibold text-slate-700">Finding:</strong> {item.finding}</p>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-blue-800"><strong className="font-semibold text-blue-900">Recommendation:</strong> {item.recommendation}</p>
                  </div>
                  <details className="text-xs bg-slate-50 p-2 rounded border mt-3">
                    <summary className="cursor-pointer font-medium text-slate-600">Show Regulation Text & Manual Reference</summary>
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-slate-500 mb-1"><strong className="font-semibold text-slate-600">Regulation:</strong> {item.regulationText}</p>
                      <p className="text-slate-500"><strong className="font-semibold text-slate-600">Manual Reference:</strong> {item.manualReference}</p>
                    </div>
                  </details>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-10 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-green-800">No Non-Conformities Found</h3>
                <p className="text-green-700">The AI analysis did not detect any non-conformities based on the provided text.</p>
              </div>
            )}
          </div>
        );
      case 'questions':
        return (
          <div className="space-y-4 p-4 sm:p-6">
            {results.questions.map((item, index) => (
              <div key={index} className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                <h4 className="font-semibold text-slate-800 text-md flex items-start">
                  <QuestionMarkCircleIcon className="w-5 h-5 text-blue-500 inline-block mr-2 mt-0.5 flex-shrink-0" />
                  <span>{item.question}</span>
                </h4>
                <p className="text-sm text-slate-500 mt-2 pl-7"><strong className="font-medium">Clause:</strong> {item.regulationClause} | <strong className="font-medium">Reason:</strong> {item.reasoning}</p>
              </div>
            ))}
          </div>
        );
      case 'section-analysis':
        return (
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-slate-200 rounded-lg">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">MOE Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {results.sectionAnalysis.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.moeSection}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><StatusBadge status={item.status} /></td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'version-analysis':
        return (
          <div className="space-y-4 p-4 sm:p-6">
            {(results.versionChangeAnalysis && results.versionChangeAnalysis.length > 0) ? (
              results.versionChangeAnalysis.map((item, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                  <h4 className="font-bold text-slate-800 text-lg">
                    <ArrowPathIcon className="w-6 h-6 text-purple-500 inline-block mr-2" />
                    {item.clause}
                  </h4>
                  <div className="mt-2 pl-8 space-y-2">
                    <p className="text-slate-600"><strong className="font-semibold text-slate-700">Summary of Change:</strong> {item.summaryOfChange}</p>
                    <p className="text-slate-600"><strong className="font-semibold text-slate-700">Manual Coverage:</strong> {item.manualCoverage}</p>
                    <p className="text-slate-600"><strong className="font-semibold text-slate-700">Recommendation:</strong> {item.recommendation}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800">No Version Comparison Data</h3>
                <p className="text-slate-700">This analysis was not performed, likely because a previous regulation version was not provided.</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const getTabClass = (tab: Tab) =>
    `px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${activeTab === tab
      ? 'bg-blue-600 text-white shadow'
      : 'text-slate-600 hover:bg-slate-200'
    }`;


  return (
    <div className="bg-slate-50 rounded-lg shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-4 bg-white border-b border-slate-200">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-slate-800">Audit Results</h3>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>

            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-300 rounded-lg shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={exportToCSV}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export as CSV
                  </button>
                  <button
                    onClick={exportToJSON}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Export as JSON
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Export as PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 flex space-x-2 border-b border-slate-200 -mb-4 overflow-x-auto">
          <nav className="flex space-x-1 pb-px" aria-label="Tabs">
            <button onClick={() => setActiveTab('summary')} className={getTabClass('summary')}>Summary</button>
            <button onClick={() => setActiveTab('section-analysis')} className={getTabClass('section-analysis')}>Section Analysis</button>
            <button onClick={() => setActiveTab('non-conformities')} className={getTabClass('non-conformities')}>
              Non-Conformities <span className="ml-1.5 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{results.nonConformities.length}</span>
            </button>
            <button onClick={() => setActiveTab('questions')} className={getTabClass('questions')}>
              Auditor Questions <span className="ml-1.5 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{results.questions.length}</span>
            </button>
            {results.versionChangeAnalysis && (
              <button onClick={() => setActiveTab('version-analysis')} className={getTabClass('version-analysis')}>
                Version Analysis <span className="ml-1.5 bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{results.versionChangeAnalysis.length}</span>
              </button>
            )}
          </nav>
        </div>
      </div>
      {renderContent()}
    </div>
  );
};

export default ResultsDisplay;
