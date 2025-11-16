import { AuditResult } from '../types';
import { performAudit } from './geminiService';
import { HistoryService } from './historyService';

export interface BatchAuditItem {
    id: string;
    regulationText: string;
    manualText: string;
    oldRegulationText?: string;
    metadata: {
        organizationName?: string;
        auditName?: string;
        regulationName?: string;
        manualName?: string;
    };
}

export interface BatchAuditResult {
    id: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    result?: AuditResult;
    error?: string;
    progress: number;
    startTime?: Date;
    endTime?: Date;
    metadata: BatchAuditItem['metadata'];
}

export type BatchProcessingMode = 'sequential' | 'parallel';

export interface BatchProgress {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    percentage: number;
}

/**
 * Service for batch processing multiple audits
 */
export class BatchService {
    private static activeJobs = new Map<string, BatchAuditResult[]>();

    /**
     * Process multiple audits in batch mode
     * @param items - Array of audit items to process
     * @param mode - Processing mode (sequential or parallel)
     * @param onProgress - Callback for progress updates
     * @param maxParallel - Maximum concurrent audits in parallel mode (default: 3)
     */
    static async processBatch(
        items: BatchAuditItem[],
        mode: BatchProcessingMode = 'sequential',
        onProgress?: (progress: BatchProgress, results: BatchAuditResult[]) => void,
        maxParallel: number = 3
    ): Promise<BatchAuditResult[]> {
        const batchId = this.generateBatchId();

        // Initialize results
        const results: BatchAuditResult[] = items.map(item => ({
            id: item.id,
            status: 'pending',
            progress: 0,
            metadata: item.metadata
        }));

        this.activeJobs.set(batchId, results);

        try {
            if (mode === 'sequential') {
                await this.processSequential(items, results, onProgress);
            } else {
                await this.processParallel(items, results, onProgress, maxParallel);
            }
        } finally {
            this.activeJobs.delete(batchId);
        }

        return results;
    }

    /**
     * Process audits sequentially (one at a time)
     */
    private static async processSequential(
        items: BatchAuditItem[],
        results: BatchAuditResult[],
        onProgress?: (progress: BatchProgress, results: BatchAuditResult[]) => void
    ): Promise<void> {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const result = results[i];

            result.status = 'processing';
            result.startTime = new Date();
            result.progress = 0;

            this.notifyProgress(results, onProgress);

            try {
                const auditResult = await performAudit(
                    item.regulationText,
                    item.manualText,
                    item.oldRegulationText
                );

                result.result = auditResult;
                result.status = 'success';
                result.endTime = new Date();
                result.progress = 100;

                // Save to history
                HistoryService.saveAudit(auditResult, item.metadata);
            } catch (error) {
                result.status = 'error';
                result.error = error instanceof Error ? error.message : 'Unknown error';
                result.endTime = new Date();
            }

            this.notifyProgress(results, onProgress);
        }
    }

    /**
     * Process audits in parallel with concurrency limit
     */
    private static async processParallel(
        items: BatchAuditItem[],
        results: BatchAuditResult[],
        onProgress?: (progress: BatchProgress, results: BatchAuditResult[]) => void,
        maxParallel: number = 3
    ): Promise<void> {
        const queue = [...items];
        const processing: Promise<void>[] = [];

        const processNext = async (index: number): Promise<void> => {
            const item = items[index];
            const result = results[index];

            result.status = 'processing';
            result.startTime = new Date();
            result.progress = 0;

            this.notifyProgress(results, onProgress);

            try {
                const auditResult = await performAudit(
                    item.regulationText,
                    item.manualText,
                    item.oldRegulationText
                );

                result.result = auditResult;
                result.status = 'success';
                result.endTime = new Date();
                result.progress = 100;

                // Save to history
                HistoryService.saveAudit(auditResult, item.metadata);
            } catch (error) {
                result.status = 'error';
                result.error = error instanceof Error ? error.message : 'Unknown error';
                result.endTime = new Date();
            }

            this.notifyProgress(results, onProgress);
        };

        // Start initial batch of parallel jobs
        const activePromises: Set<Promise<void>> = new Set();

        for (let i = 0; i < Math.min(maxParallel, items.length); i++) {
            const promise = processNext(i);
            activePromises.add(promise);
            promise.finally(() => activePromises.delete(promise));
        }

        // Process remaining items
        let currentIndex = maxParallel;
        while (currentIndex < items.length || activePromises.size > 0) {
            if (activePromises.size > 0) {
                // Wait for one job to complete
                await Promise.race(Array.from(activePromises));
            }

            // Start next job if we have capacity and items remaining
            while (activePromises.size < maxParallel && currentIndex < items.length) {
                const promise = processNext(currentIndex);
                activePromises.add(promise);
                promise.finally(() => activePromises.delete(promise));
                currentIndex++;
            }
        }
    }

    /**
     * Calculate and notify progress
     */
    private static notifyProgress(
        results: BatchAuditResult[],
        onProgress?: (progress: BatchProgress, results: BatchAuditResult[]) => void
    ): void {
        const progress = this.calculateProgress(results);
        onProgress?.(progress, results);
    }

    /**
     * Calculate batch progress statistics
     */
    static calculateProgress(results: BatchAuditResult[]): BatchProgress {
        const total = results.length;
        const completed = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'error').length;
        const inProgress = results.filter(r => r.status === 'processing').length;
        const percentage = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

        return {
            total,
            completed,
            failed,
            inProgress,
            percentage
        };
    }

    /**
     * Generate a unique batch ID
     */
    private static generateBatchId(): string {
        return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Get active batch jobs
     */
    static getActiveJobs(): Map<string, BatchAuditResult[]> {
        return new Map(this.activeJobs);
    }

    /**
     * Cancel all active batch jobs
     */
    static cancelAllJobs(): void {
        this.activeJobs.clear();
    }
}
