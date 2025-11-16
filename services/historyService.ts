import { AuditResult } from '../types';

export interface StoredAudit {
    id: string;
    timestamp: Date;
    result: AuditResult;
    organizationName?: string;
    auditName?: string;
    regulationName?: string;
    manualName?: string;
}

const HISTORY_KEY = 'aaa_audit_history';
const MAX_HISTORY_ITEMS = 50; // Limit to prevent localStorage overflow

export class HistoryService {
    /**
     * Save an audit result to history
     */
    static saveAudit(
        result: AuditResult,
        metadata: {
            organizationName?: string;
            auditName?: string;
            regulationName?: string;
            manualName?: string;
        } = {}
    ): StoredAudit {
        const storedAudit: StoredAudit = {
            id: this.generateId(),
            timestamp: new Date(),
            result,
            ...metadata
        };

        const history = this.getHistory();
        history.unshift(storedAudit); // Add to beginning

        // Keep only the most recent items
        const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
        } catch (error) {
            console.error('Failed to save audit to history:', error);
            // If quota exceeded, remove oldest items and try again
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                const reducedHistory = history.slice(0, Math.floor(MAX_HISTORY_ITEMS / 2));
                localStorage.setItem(HISTORY_KEY, JSON.stringify(reducedHistory));
            }
        }

        return storedAudit;
    }

    /**
     * Get all audit history
     */
    static getHistory(): StoredAudit[] {
        try {
            const data = localStorage.getItem(HISTORY_KEY);
            if (!data) return [];

            const history = JSON.parse(data) as StoredAudit[];
            // Convert timestamp strings back to Date objects
            return history.map(audit => ({
                ...audit,
                timestamp: new Date(audit.timestamp)
            }));
        } catch (error) {
            console.error('Failed to load audit history:', error);
            return [];
        }
    }

    /**
     * Get a specific audit by ID
     */
    static getAuditById(id: string): StoredAudit | null {
        const history = this.getHistory();
        return history.find(audit => audit.id === id) || null;
    }

    /**
     * Delete an audit from history
     */
    static deleteAudit(id: string): boolean {
        const history = this.getHistory();
        const filtered = history.filter(audit => audit.id !== id);

        if (filtered.length === history.length) {
            return false; // ID not found
        }

        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('Failed to delete audit:', error);
            return false;
        }
    }

    /**
     * Clear all audit history
     */
    static clearHistory(): boolean {
        try {
            localStorage.removeItem(HISTORY_KEY);
            return true;
        } catch (error) {
            console.error('Failed to clear history:', error);
            return false;
        }
    }

    /**
     * Get statistics about audit history
     */
    static getStatistics() {
        const history = this.getHistory();

        if (history.length === 0) {
            return {
                totalAudits: 0,
                averageNonConformities: 0,
                mostCommonSeverity: null,
                oldestAudit: null,
                newestAudit: null
            };
        }

        const totalNonConformities = history.reduce(
            (sum, audit) => sum + audit.result.nonConformities.length,
            0
        );

        const severityCounts = { High: 0, Medium: 0, Low: 0 };
        history.forEach(audit => {
            audit.result.nonConformities.forEach(nc => {
                severityCounts[nc.severity]++;
            });
        });

        const mostCommonSeverity = Object.entries(severityCounts).reduce((max, [severity, count]) =>
            count > max[1] ? [severity, count] as [string, number] : max,
            ['', 0] as [string, number]
        )[0];

        return {
            totalAudits: history.length,
            averageNonConformities: Math.round(totalNonConformities / history.length),
            mostCommonSeverity,
            oldestAudit: history[history.length - 1].timestamp,
            newestAudit: history[0].timestamp
        };
    }

    /**
     * Search audit history by organization name or audit name
     */
    static searchHistory(query: string): StoredAudit[] {
        const history = this.getHistory();
        const lowerQuery = query.toLowerCase();

        return history.filter(audit =>
            audit.organizationName?.toLowerCase().includes(lowerQuery) ||
            audit.auditName?.toLowerCase().includes(lowerQuery) ||
            audit.regulationName?.toLowerCase().includes(lowerQuery) ||
            audit.manualName?.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Export history as JSON
     */
    static exportHistory(): string {
        const history = this.getHistory();
        return JSON.stringify(history, null, 2);
    }

    /**
     * Import history from JSON
     */
    static importHistory(jsonData: string): boolean {
        try {
            const importedHistory = JSON.parse(jsonData) as StoredAudit[];

            // Validate the data structure
            if (!Array.isArray(importedHistory)) {
                throw new Error('Invalid history format');
            }

            // Merge with existing history
            const existingHistory = this.getHistory();
            const mergedHistory = [...importedHistory, ...existingHistory];

            // Remove duplicates based on ID
            const uniqueHistory = mergedHistory.filter(
                (audit, index, self) => index === self.findIndex(a => a.id === audit.id)
            );

            // Keep only the most recent items
            const trimmedHistory = uniqueHistory.slice(0, MAX_HISTORY_ITEMS);

            localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
            return true;
        } catch (error) {
            console.error('Failed to import history:', error);
            return false;
        }
    }

    /**
     * Generate a unique ID for an audit
     */
    private static generateId(): string {
        return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
