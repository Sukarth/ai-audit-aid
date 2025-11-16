import React, { useState, useCallback } from 'react';
import { BatchService, BatchAuditItem, BatchAuditResult, BatchProgress, BatchProcessingMode } from '../services/batchService';
import { AuditResult } from '../types';
import { XCircleIcon } from './icons/XCircleIcon';

// Make TypeScript aware of the global libraries loaded from CDN
declare const pdfjsLib: any;
declare const mammoth: any;

interface BatchAuditProps {
    onClose: () => void;
    onComplete?: (results: BatchAuditResult[]) => void;
}

interface BatchFileInput {
    id: string;
    regulationFile: File | null;
    manualFile: File | null;
    oldRegulationFile?: File | null;
    organizationName: string;
    auditName: string;
}

// File input component matching the main audit style
const FileInputBatch: React.FC<{
    id: string;
    label: string;
    required: boolean;
    file: File | null;
    onFileChange: (file: File | null) => void;
}> = ({ id, label, required, file, onFileChange }) => {
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFileChange(e.target.files ? e.target.files[0] : null);
    };

    const handleClearFile = () => {
        onFileChange(null);
        const input = document.getElementById(id) as HTMLInputElement;
        if (input) input.value = '';
    };

    return (
        <div className="flex flex-col p-4 border border-slate-300 rounded-lg bg-white">
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
                {label} {required ? <span className="text-red-500">*</span> : <span className="text-slate-400">(Optional)</span>}
            </label>
            {file ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white border border-slate-300 rounded-md">
                        <div className="flex items-center space-x-2 truncate">
                            <span className="text-sm text-slate-800 truncate">{file.name}</span>
                        </div>
                        <button onClick={handleClearFile} className="flex-shrink-0 text-slate-400 hover:text-red-600">
                            <XCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
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

export const BatchAudit: React.FC<BatchAuditProps> = ({ onClose, onComplete }) => {
    const [fileInputs, setFileInputs] = useState<BatchFileInput[]>([
        { id: '1', regulationFile: null, manualFile: null, organizationName: '', auditName: '' }
    ]);
    const [processing, setProcessing] = useState(false);
    const [processingMode, setProcessingMode] = useState<BatchProcessingMode>('sequential');
    const [progress, setProgress] = useState<BatchProgress | null>(null);
    const [results, setResults] = useState<BatchAuditResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Add new file input row
    const addFileInput = () => {
        const newId = (fileInputs.length + 1).toString();
        setFileInputs([...fileInputs, {
            id: newId,
            regulationFile: null,
            manualFile: null,
            organizationName: '',
            auditName: ''
        }]);
    };

    // Remove file input row
    const removeFileInput = (id: string) => {
        if (fileInputs.length > 1) {
            setFileInputs(fileInputs.filter(input => input.id !== id));
        }
    };

    // Update file input
    const updateFileInput = (id: string, field: keyof BatchFileInput, value: any) => {
        setFileInputs(fileInputs.map(input =>
            input.id === id ? { ...input, [field]: value } : input
        ));
    };

    // Parse file to text
    const parseFile = async (file: File): Promise<string> => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const buffer = await file.arrayBuffer();

        if (extension === 'pdf') {
            const pdfjsLib = (window as any).pdfjsLib;
            const pdf = await pdfjsLib.getDocument(buffer).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map((item: any) => item.str).join(' ') + '\n';
            }
            return text;
        } else if (extension === 'docx') {
            const mammoth = (window as any).mammoth;
            const result = await mammoth.extractRawText({ arrayBuffer: buffer });
            return result.value;
        } else if (extension === 'txt' || extension === 'md') {
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(buffer);
        }
        throw new Error(`Unsupported file format: ${extension}`);
    };

    // Start batch processing
    const handleStartBatch = async () => {
        setError(null);
        setProcessing(true);
        setResults([]);
        setProgress(null);

        try {
            // Validate inputs
            const validInputs = fileInputs.filter(input =>
                input.regulationFile && input.manualFile
            );

            if (validInputs.length === 0) {
                throw new Error('Please add at least one complete audit (regulation + manual)');
            }

            // Parse all files
            const batchItems: BatchAuditItem[] = [];

            for (const input of validInputs) {
                const regulationText = await parseFile(input.regulationFile!);
                const manualText = await parseFile(input.manualFile!);
                const oldRegulationText = input.oldRegulationFile
                    ? await parseFile(input.oldRegulationFile)
                    : undefined;

                batchItems.push({
                    id: input.id,
                    regulationText,
                    manualText,
                    oldRegulationText,
                    metadata: {
                        organizationName: input.organizationName || undefined,
                        auditName: input.auditName || undefined,
                        regulationName: input.regulationFile.name,
                        manualName: input.manualFile.name
                    }
                });
            }

            // Process batch
            const batchResults = await BatchService.processBatch(
                batchItems,
                processingMode,
                (prog, res) => {
                    setProgress(prog);
                    setResults(res);
                }
            );

            setResults(batchResults);
            onComplete?.(batchResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Batch processing failed');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusIcon = (status: BatchAuditResult['status']) => {
        switch (status) {
            case 'success':
                return <span className="text-green-600">✅</span>;
            case 'error':
                return <span className="text-red-600">❌</span>;
            case 'processing':
                return <span className="text-blue-600">⏳</span>;
            default:
                return <span className="text-gray-400">⏸️</span>;
        }
    };

    const canStartBatch = fileInputs.some(input => input.regulationFile && input.manualFile) && !processing;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto mt-0 mb-0 !mt-0 !mb-0">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Batch Audit Processing</h2>
                            <p className="text-sm text-slate-600 mt-1">Process multiple audits simultaneously</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Close batch audit"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Processing Mode */}
                    {!processing && results.length === 0 && (
                        <div className="mt-4 flex items-center gap-4">
                            <label className="text-sm font-medium text-slate-700">Processing Mode:</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setProcessingMode('sequential')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${processingMode === 'sequential'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                >
                                    Sequential (Slower, Safer)
                                </button>
                                <button
                                    onClick={() => setProcessingMode('parallel')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${processingMode === 'parallel'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                >
                                    Parallel (Faster, 3 at a time)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    {progress && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-700">
                                    Progress: {progress.completed + progress.failed}/{progress.total} audits
                                </span>
                                <span className="text-sm text-slate-600">
                                    {progress.percentage}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                                <div
                                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                            <div className="flex gap-4 mt-2 text-xs">
                                <span className="text-green-600">✅ {progress.completed} completed</span>
                                <span className="text-red-600">❌ {progress.failed} failed</span>
                                <span className="text-blue-600">⏳ {progress.inProgress} in progress</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* File Inputs */}
                {!processing && results.length === 0 && (
                    <div className="p-6">
                        <div className="space-y-4">
                            {fileInputs.map((input, index) => (
                                <div key={input.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-slate-800">Audit #{index + 1}</h3>
                                        {fileInputs.length > 1 && (
                                            <button
                                                onClick={() => removeFileInput(input.id)}
                                                className="text-red-600 hover:text-red-700 text-sm"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Organization & Audit Name */}
                                        <input
                                            type="text"
                                            placeholder="Organization Name (optional)"
                                            value={input.organizationName}
                                            onChange={(e) => updateFileInput(input.id, 'organizationName', e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Audit Name (optional)"
                                            value={input.auditName}
                                            onChange={(e) => updateFileInput(input.id, 'auditName', e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />

                                        {/* Regulation File */}
                                        <FileInputBatch
                                            id={`regulation-${input.id}`}
                                            label="Regulation Document"
                                            required={true}
                                            file={input.regulationFile}
                                            onFileChange={(file) => updateFileInput(input.id, 'regulationFile', file)}
                                        />

                                        {/* Manual File */}
                                        <FileInputBatch
                                            id={`manual-${input.id}`}
                                            label="MOE Manual"
                                            required={true}
                                            file={input.manualFile}
                                            onFileChange={(file) => updateFileInput(input.id, 'manualFile', file)}
                                        />

                                        {/* Old Regulation (Optional) */}
                                        <div className="md:col-span-2">
                                            <FileInputBatch
                                                id={`old-regulation-${input.id}`}
                                                label="Previous Regulation"
                                                required={false}
                                                file={input.oldRegulationFile || null}
                                                onFileChange={(file) => updateFileInput(input.id, 'oldRegulationFile', file)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={addFileInput}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                            >
                                + Add Another Audit
                            </button>
                            <button
                                onClick={handleStartBatch}
                                disabled={!canStartBatch}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                                Start Batch Processing
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                                <strong className="font-bold">Error: </strong>
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Results */}
                {results.length > 0 && (
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Batch Results</h3>
                        <div className="space-y-3">
                            {results.map((result, index) => (
                                <div
                                    key={result.id}
                                    className={`border rounded-lg p-4 ${result.status === 'success' ? 'border-green-200 bg-green-50' :
                                            result.status === 'error' ? 'border-red-200 bg-red-50' :
                                                result.status === 'processing' ? 'border-blue-200 bg-blue-50' :
                                                    'border-slate-200 bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="text-2xl">{getStatusIcon(result.status)}</div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-slate-800">
                                                    Audit #{index + 1}: {result.metadata.auditName || result.metadata.organizationName || 'Untitled'}
                                                </h4>
                                                {result.metadata.regulationName && (
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        Regulation: {result.metadata.regulationName}
                                                    </p>
                                                )}
                                                {result.status === 'success' && result.result && (
                                                    <p className="text-sm text-green-700 mt-2">
                                                        ✅ Completed • {result.result.nonConformities.length} non-conformities found
                                                    </p>
                                                )}
                                                {result.status === 'error' && (
                                                    <p className="text-sm text-red-700 mt-2">
                                                        ❌ Failed: {result.error}
                                                    </p>
                                                )}
                                                {result.status === 'processing' && (
                                                    <p className="text-sm text-blue-700 mt-2">
                                                        ⏳ Processing...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!processing && (
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setResults([]);
                                        setProgress(null);
                                        setError(null);
                                    }}
                                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                                >
                                    Start New Batch
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
