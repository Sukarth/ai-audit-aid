import { AuditResult, NonConformity } from '../types';

export interface AuditComparison {
    audit1: AuditResult;
    audit2: AuditResult;
    changes: {
        newNonConformities: NonConformity[];
        resolvedNonConformities: NonConformity[];
        unchangedNonConformities: NonConformity[];
        changedSeverity: Array<{
            before: NonConformity;
            after: NonConformity;
            change: 'upgraded' | 'downgraded';
        }>;
    };
    statistics: {
        totalIssuesRemoved: number;
        totalIssuesAdded: number;
        severityUpgrades: number;
        severityDowngrades: number;
        overallProgress: 'improved' | 'declined' | 'unchanged';
        complianceImprovement: number; // percentage change
    };
}

/**
 * Compare two audit results to track remediation progress
 * @param audit1 - First (older) audit result
 * @param audit2 - Second (newer) audit result
 * @returns Detailed comparison analysis
 */
export function compareAudits(audit1: AuditResult, audit2: AuditResult): AuditComparison {
    const newNonConformities: NonConformity[] = [];
    const resolvedNonConformities: NonConformity[] = [];
    const unchangedNonConformities: NonConformity[] = [];
    const changedSeverity: Array<{
        before: NonConformity;
        after: NonConformity;
        change: 'upgraded' | 'downgraded';
    }> = [];

    // Create maps for easy lookup
    const audit1Map = new Map<string, NonConformity>();
    const audit2Map = new Map<string, NonConformity>();

    audit1.nonConformities.forEach((nc) => {
        const key = `${nc.regulationClause}-${nc.manualReference}`;
        audit1Map.set(key, nc);
    });

    audit2.nonConformities.forEach((nc) => {
        const key = `${nc.regulationClause}-${nc.manualReference}`;
        audit2Map.set(key, nc);
    });

    // Find resolved non-conformities (in audit1 but not in audit2)
    audit1Map.forEach((nc, key) => {
        if (!audit2Map.has(key)) {
            resolvedNonConformities.push(nc);
        }
    });

    // Find new non-conformities (in audit2 but not in audit1) and severity changes
    audit2Map.forEach((nc2, key) => {
        const nc1 = audit1Map.get(key);

        if (!nc1) {
            // New non-conformity
            newNonConformities.push(nc2);
        } else {
            // Exists in both - check for severity changes
            if (nc1.severity !== nc2.severity) {
                const severityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                const change = severityOrder[nc2.severity] > severityOrder[nc1.severity]
                    ? 'upgraded' as const
                    : 'downgraded' as const;

                changedSeverity.push({
                    before: nc1,
                    after: nc2,
                    change
                });
            } else {
                unchangedNonConformities.push(nc2);
            }
        }
    });

    // Calculate statistics
    const totalIssuesRemoved = resolvedNonConformities.length;
    const totalIssuesAdded = newNonConformities.length;
    const severityUpgrades = changedSeverity.filter(c => c.change === 'upgraded').length;
    const severityDowngrades = changedSeverity.filter(c => c.change === 'downgraded').length;

    // Calculate overall progress
    let overallProgress: 'improved' | 'declined' | 'unchanged';
    const netChange = totalIssuesRemoved - totalIssuesAdded - severityUpgrades + severityDowngrades;

    if (netChange > 0) {
        overallProgress = 'improved';
    } else if (netChange < 0) {
        overallProgress = 'declined';
    } else {
        overallProgress = 'unchanged';
    }

    // Calculate compliance improvement percentage
    const audit1Total = audit1.nonConformities.length;
    const audit2Total = audit2.nonConformities.length;
    const complianceImprovement = audit1Total > 0
        ? Math.round(((audit1Total - audit2Total) / audit1Total) * 100)
        : 0;

    return {
        audit1,
        audit2,
        changes: {
            newNonConformities,
            resolvedNonConformities,
            unchangedNonConformities,
            changedSeverity
        },
        statistics: {
            totalIssuesRemoved,
            totalIssuesAdded,
            severityUpgrades,
            severityDowngrades,
            overallProgress,
            complianceImprovement
        }
    };
}

/**
 * Generate a summary report of the comparison
 */
export function generateComparisonSummary(comparison: AuditComparison): string {
    const { statistics, changes } = comparison;

    let summary = `Audit Comparison Summary\n`;
    summary += `========================\n\n`;

    summary += `Overall Progress: ${statistics.overallProgress.toUpperCase()}\n`;
    summary += `Compliance Improvement: ${statistics.complianceImprovement > 0 ? '+' : ''}${statistics.complianceImprovement}%\n\n`;

    summary += `Changes:\n`;
    summary += `- Issues Resolved: ${statistics.totalIssuesRemoved}\n`;
    summary += `- New Issues Found: ${statistics.totalIssuesAdded}\n`;
    summary += `- Severity Upgrades: ${statistics.severityUpgrades}\n`;
    summary += `- Severity Downgrades: ${statistics.severityDowngrades}\n`;
    summary += `- Unchanged Issues: ${changes.unchangedNonConformities.length}\n\n`;

    if (changes.resolvedNonConformities.length > 0) {
        summary += `✅ Resolved Issues:\n`;
        changes.resolvedNonConformities.forEach((nc, i) => {
            summary += `${i + 1}. ${nc.regulationClause} - ${nc.finding.substring(0, 80)}...\n`;
        });
        summary += `\n`;
    }

    if (changes.newNonConformities.length > 0) {
        summary += `⚠️ New Issues:\n`;
        changes.newNonConformities.forEach((nc, i) => {
            summary += `${i + 1}. ${nc.regulationClause} - ${nc.finding.substring(0, 80)}...\n`;
        });
        summary += `\n`;
    }

    if (changes.changedSeverity.length > 0) {
        summary += `🔄 Severity Changes:\n`;
        changes.changedSeverity.forEach((change, i) => {
            const arrow = change.change === 'upgraded' ? '⬆️' : '⬇️';
            summary += `${i + 1}. ${arrow} ${change.before.regulationClause}: ${change.before.severity} → ${change.after.severity}\n`;
        });
    }

    return summary;
}
