import React, { useState, useCallback } from 'react';
import { performAudit } from '../services/geminiService';
import { AuditResult, AuditStatus } from '../types';
import ResultsDisplay from './ResultsDisplay';
import Loader from './Loader';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { AuditHistory } from './AuditHistory';
import { AuditComparisonComponent } from './AuditComparison';
import { BatchAudit } from './BatchAudit';
import { HistoryService, StoredAudit } from '../services/historyService';
import { compareAudits, AuditComparison } from '../services/comparisonService';
import { FrameworkSelector } from './FrameworkSelector';
import { RegulatoryFramework } from '../services/frameworkService';

// Make TypeScript aware of the global libraries loaded from CDN
declare const pdfjsLib: any;
declare const mammoth: any;

const FileInput: React.FC<{
  id: string;
  label: string;
  required: boolean;
  file: File | null;
  parsing: boolean;
  progress: number;
  onFileChange: (file: File | null) => void;
}> = ({ id, label, required, file, parsing, progress, onFileChange }) => {

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(e.target.files ? e.target.files[0] : null);
  };

  const handleClearFile = () => {
    onFileChange(null);
    const input = document.getElementById(id) as HTMLInputElement;
    if (input) input.value = '';
  }

  return (
    <div className="flex flex-col p-4 border border-slate-300 rounded-lg bg-slate-50 h-full">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
        {label} {required ? <span className="text-red-500">*</span> : <span className="text-slate-400">(Optional)</span>}
      </label>
      {file ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-white border border-slate-300 rounded-md">
            <div className="flex items-center space-x-2 truncate">
              {parsing && <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
              <span className="text-sm text-slate-800 truncate">{parsing ? `Parsing ${file.name}...` : file.name}</span>
            </div>
            <button onClick={handleClearFile} className="flex-shrink-0 text-slate-400 hover:text-red-600" disabled={parsing}>
              <XCircleIcon className="w-5 h-5" />
            </button>
          </div>
          {parsing && progress > 0 && (
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
              <div className="text-xs text-slate-500 text-right mt-1">{progress}%</div>
            </div>
          )}
        </div>
      ) : (
        <input
          id={id}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileSelect}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      )}
    </div>
  );
};

const AuditDashboard: React.FC = () => {
  const [currentRegulationFile, setCurrentRegulationFile] = useState<File | null>(null);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [oldRegulationFile, setOldRegulationFile] = useState<File | null>(null);

  const [currentRegulationText, setCurrentRegulationText] = useState<string>('');
  const [manualText, setManualText] = useState<string>('');
  const [oldRegulationText, setOldRegulationText] = useState<string>('');

  const [parsingState, setParsingState] = useState({ current: false, manual: false, old: false });
  const [parsingProgress, setParsingProgress] = useState({ current: 0, manual: 0, old: 0 });
  const [status, setStatus] = useState<AuditStatus>(AuditStatus.Idle);
  const [results, setResults] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // History and comparison states
  const [showHistory, setShowHistory] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showBatchAudit, setShowBatchAudit] = useState(false);
  const [currentComparison, setCurrentComparison] = useState<AuditComparison | null>(null);
  const [auditMetadata, setAuditMetadata] = useState({
    organizationName: '',
    auditName: ''
  });
  const [selectedFramework, setSelectedFramework] = useState<RegulatoryFramework>('aviation-145');

  const handleFrameworkChange = (framework: RegulatoryFramework) => {
    setSelectedFramework(framework);
    // Clear cache when framework changes to force re-audit
    setResults(null);
    setStatus(AuditStatus.Idle);
  };

  const parseFile = async (file: File, parsingKey: keyof typeof parsingState): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const buffer = await file.arrayBuffer();

    if (extension === 'pdf') {
      const pdf = await pdfjsLib.getDocument(buffer).promise;
      let text = '';
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';

        // Update progress
        const progress = Math.round((i / totalPages) * 100);
        setParsingProgress(prev => ({ ...prev, [parsingKey]: progress }));
      }
      return text;
    } else if (extension === 'docx') {
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      setParsingProgress(prev => ({ ...prev, [parsingKey]: 100 }));
      return result.value;
    } else { // txt, md
      const text = new TextDecoder().decode(buffer);
      setParsingProgress(prev => ({ ...prev, [parsingKey]: 100 }));
      return text;
    }
  };

  const handleFileChange = useCallback(async (
    file: File | null,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setText: React.Dispatch<React.SetStateAction<string>>,
    parsingKey: keyof typeof parsingState
  ) => {
    setFile(file);
    if (!file) {
      setText('');
      setParsingProgress(prev => ({ ...prev, [parsingKey]: 0 }));
      return;
    }

    setParsingState(prev => ({ ...prev, [parsingKey]: true }));
    setParsingProgress(prev => ({ ...prev, [parsingKey]: 0 }));
    setError(null);
    setStatus(AuditStatus.Idle);

    try {
      const text = await parseFile(file, parsingKey);
      setText(text);
    } catch (e) {
      console.error("File parsing error:", e);
      setError(`Failed to parse file: ${file.name}. Please ensure it is not corrupted and is a supported format.`);
      setStatus(AuditStatus.Error);
      setFile(null);
      setText('');
    } finally {
      setParsingState(prev => ({ ...prev, [parsingKey]: false }));
    }
  }, []);


  const handleRunAudit = useCallback(async () => {
    if (!currentRegulationText || !manualText) {
      setError('EASA document and MOE document are required.');
      setStatus(AuditStatus.Error);
      return;
    }
    setStatus(AuditStatus.Loading);
    setError(null);
    setResults(null);

    try {
      const auditResults = await performAudit(currentRegulationText, manualText, oldRegulationText);
      setResults(auditResults);
      setStatus(AuditStatus.Success);

      // Save to history
      if (auditResults) {
        HistoryService.saveAudit(auditResults, {
          organizationName: auditMetadata.organizationName || undefined,
          auditName: auditMetadata.auditName || undefined,
          regulationName: currentRegulationFile?.name,
          manualName: manualFile?.name
        });
      }
    } catch (err) {
      console.error('Audit failed:', err);
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred during the audit.'
      );
      setStatus(AuditStatus.Error);
    }
  }, [currentRegulationText, manualText, oldRegulationText, auditMetadata, currentRegulationFile, manualFile]);

  const handleCompareAudits = (audit1: StoredAudit, audit2: StoredAudit) => {
    const comparison = compareAudits(audit1.result, audit2.result);
    setCurrentComparison(comparison);
    setShowHistory(false);
    setShowComparison(true);
  };

  const handleViewStoredAudit = (audit: StoredAudit) => {
    setResults(audit.result);
    setStatus(AuditStatus.Success);
    setShowHistory(false);

    // Update metadata
    if (audit.organizationName || audit.auditName) {
      setAuditMetadata({
        organizationName: audit.organizationName || '',
        auditName: audit.auditName || ''
      });
    }
  };

  const isParsing = parsingState.current || parsingState.manual || parsingState.old;
  const isButtonDisabled = status === AuditStatus.Loading || isParsing || !currentRegulationFile || !manualFile;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="p-6 bg-white rounded-lg shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-slate-800">Compliance Test Bench</h2>
            <FrameworkSelector onFrameworkChange={handleFrameworkChange} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBatchAudit(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Batch Audit
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
          </div>
        </div>
        <p className="text-slate-600 mb-6">
          Upload the required documents to begin the compliance analysis. The AI will cross-reference the MOE against the EASA rules, identify gaps, and highlight changes between regulatory versions.
        </p>

        {/* Optional metadata fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="Organization Name (optional)"
            value={auditMetadata.organizationName}
            onChange={(e) => setAuditMetadata(prev => ({ ...prev, organizationName: e.target.value }))}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Audit Name (optional)"
            value={auditMetadata.auditName}
            onChange={(e) => setAuditMetadata(prev => ({ ...prev, auditName: e.target.value }))}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FileInput id="current-regulation" label="EASA Easy Access Document" required={true} file={currentRegulationFile} parsing={parsingState.current} progress={parsingProgress.current} onFileChange={(file) => handleFileChange(file, setCurrentRegulationFile, setCurrentRegulationText, 'current')} />
          <FileInput id="manual" label="MOE Document" required={true} file={manualFile} parsing={parsingState.manual} progress={parsingProgress.manual} onFileChange={(file) => handleFileChange(file, setManualFile, setManualText, 'manual')} />
          <FileInput id="old-regulation" label="Optional: Previous Regulation / Example MOE" required={false} file={oldRegulationFile} parsing={parsingState.old} progress={parsingProgress.old} onFileChange={(file) => handleFileChange(file, setOldRegulationFile, setOldRegulationText, 'old')} />
        </div>
        <div className="mt-6 flex flex-col items-center">
          <button
            onClick={handleRunAudit}
            disabled={isButtonDisabled}
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {status === AuditStatus.Loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                Run AI Audit
              </>
            )}
          </button>
        </div>
      </div>

      {status === AuditStatus.Loading && <Loader />}

      {status === AuditStatus.Error && error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-md" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {status === AuditStatus.Success && results && (
        <ResultsDisplay results={results} />
      )}

      {/* History Modal */}
      {showHistory && (
        <AuditHistory
          onSelectAudit={handleViewStoredAudit}
          onCompareAudits={handleCompareAudits}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Comparison Modal */}
      {showComparison && currentComparison && (
        <AuditComparisonComponent
          comparison={currentComparison}
          onClose={() => setShowComparison(false)}
        />
      )}

      {/* Batch Audit Modal */}
      {showBatchAudit && (
        <BatchAudit
          onClose={() => setShowBatchAudit(false)}
          onComplete={() => {
            setShowBatchAudit(false);
            setShowHistory(true); // Show history after batch completes
          }}
        />
      )}
    </div>
  );
};

export default AuditDashboard;