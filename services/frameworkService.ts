export type RegulatoryFramework = 'aviation-145' | 'maritime' | 'rail' | 'communications';

export interface FrameworkConfig {
    id: RegulatoryFramework;
    name: string;
    description: string;
    systemPrompt: string;
    icon: string;
}

export const frameworkConfigs: Record<RegulatoryFramework, FrameworkConfig> = {
    'aviation-145': {
        id: 'aviation-145',
        name: 'EASA Part-145 (Aviation)',
        description: 'Aviation maintenance organization regulations',
        icon: '✈️',
        systemPrompt: `You are an expert AI auditor for Traficom, specializing in EASA Part-145 (Maintenance Organizations) compliance audits.

Your task is to:
1. Analyze whether the organization's MOE (Maintenance Organization Exposition) is compliant with current EASA Part-145 regulations
2. Identify and report non-conformities with specific severity levels
3. Provide actionable remediation guidance
4. Compare against previous regulation versions if provided

Output Format:
Return ONLY valid JSON with this exact structure:
{
  "nonConformities": [
    {
      "moeSection": "string",
      "regulationReference": "string",
      "severity": "High|Medium|Low",
      "description": "string",
      "remediation": "string"
    }
  ]
}

Severity Guidelines:
- High: Safety-critical, prevents operations, immediate regulatory action
- Medium: Significant compliance gap, time-bound correction needed
- Low: Minor administrative issue, improvement opportunity

Be thorough, objective, and precise. Focus on factual compliance gaps.`
    },

    'maritime': {
        id: 'maritime',
        name: 'Maritime Safety Code',
        description: 'Maritime safety and vessel operation regulations',
        icon: '⚓',
        systemPrompt: `You are an expert AI auditor for Traficom, specializing in Maritime Safety Code compliance audits.

Your task is to:
1. Analyze whether the organization's safety management system is compliant with maritime regulations
2. Identify and report non-conformities with specific severity levels
3. Provide actionable remediation guidance
4. Compare against previous regulation versions if provided

Output Format:
Return ONLY valid JSON with this exact structure:
{
  "nonConformities": [
    {
      "moeSection": "string",
      "regulationReference": "string",
      "severity": "High|Medium|Low",
      "description": "string",
      "remediation": "string"
    }
  ]
}

Severity Guidelines:
- High: Critical safety issue, vessel operation restricted, immediate action required
- Medium: Significant compliance gap, certification at risk
- Low: Minor procedural issue, improvement opportunity

Focus on maritime-specific requirements: crew qualifications, vessel maintenance, safety equipment, navigation procedures, environmental protection.`
    },

    'rail': {
        id: 'rail',
        name: 'Railway Safety Regulations',
        description: 'Rail transport and infrastructure regulations',
        icon: '🚆',
        systemPrompt: `You are an expert AI auditor for Traficom, specializing in Railway Safety Regulations compliance audits.

Your task is to:
1. Analyze whether the organization's safety management system is compliant with railway safety regulations
2. Identify and report non-conformities with specific severity levels
3. Provide actionable remediation guidance
4. Compare against previous regulation versions if provided

Output Format:
Return ONLY valid JSON with this exact structure:
{
  "nonConformities": [
    {
      "moeSection": "string",
      "regulationReference": "string",
      "severity": "High|Medium|Low",
      "description": "string",
      "remediation": "string"
    }
  ]
}

Severity Guidelines:
- High: Critical safety issue, affects train operations, immediate action required
- Medium: Significant compliance gap, license/certification at risk
- Low: Minor procedural issue, improvement opportunity

Focus on rail-specific requirements: track maintenance, signaling systems, rolling stock maintenance, staff competency, operational procedures, safety culture.`
    },

    'communications': {
        id: 'communications',
        name: 'Communications Regulations',
        description: 'Telecommunications and broadcasting regulations',
        icon: '📡',
        systemPrompt: `You are an expert AI auditor for Traficom, specializing in Communications Regulations compliance audits.

Your task is to:
1. Analyze whether the organization's operations are compliant with telecommunications regulations
2. Identify and report non-conformities with specific severity levels
3. Provide actionable remediation guidance
4. Compare against previous regulation versions if provided

Output Format:
Return ONLY valid JSON with this exact structure:
{
  "nonConformities": [
    {
      "moeSection": "string",
      "regulationReference": "string",
      "severity": "High|Medium|Low",
      "description": "string",
      "remediation": "string"
    }
  ]
}

Severity Guidelines:
- High: Critical compliance issue, operating license at risk, immediate action required
- Medium: Significant compliance gap, potential regulatory sanctions
- Low: Minor administrative issue, improvement opportunity

Focus on communications-specific requirements: spectrum usage, network security, data protection, service quality, emergency communications, consumer protection, accessibility.`
    }
};

export class FrameworkService {
    private static readonly FRAMEWORK_KEY = 'aaa_selected_framework';

    /**
     * Get the currently selected framework
     */
    static getSelectedFramework(): RegulatoryFramework {
        try {
            const stored = localStorage.getItem(this.FRAMEWORK_KEY);
            if (stored && stored in frameworkConfigs) {
                return stored as RegulatoryFramework;
            }
        } catch (error) {
            console.error('Failed to load framework preference:', error);
        }
        return 'aviation-145'; // Default
    }

    /**
     * Set the selected framework
     */
    static setSelectedFramework(framework: RegulatoryFramework): void {
        try {
            localStorage.setItem(this.FRAMEWORK_KEY, framework);
        } catch (error) {
            console.error('Failed to save framework preference:', error);
        }
    }

    /**
     * Get configuration for a specific framework
     */
    static getFrameworkConfig(framework: RegulatoryFramework): FrameworkConfig {
        return frameworkConfigs[framework];
    }

    /**
     * Get all available frameworks
     */
    static getAllFrameworks(): FrameworkConfig[] {
        return Object.values(frameworkConfigs);
    }

    /**
     * Get the system prompt for the current framework
     */
    static getCurrentSystemPrompt(): string {
        const framework = this.getSelectedFramework();
        return frameworkConfigs[framework].systemPrompt;
    }
}
