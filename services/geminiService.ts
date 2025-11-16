import { GoogleGenAI, Type } from "@google/genai";
import { AuditResult } from '../types';
import { cacheService } from './cacheService';
import { FrameworkService } from './frameworkService';

if (!process.env.API_KEY) {
    // In a real application, you would want to handle this more gracefully.
    // For this context, we assume the key is provided by the execution environment.
    console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "YOUR_API_KEY" });

// Configuration
const API_TIMEOUT_MS = 120000; // 2 minutes
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second

const baseSchemaProperties = {
    summary: {
        type: Type.STRING,
        description: "A concise, high-level summary of the audit findings, highlighting the overall compliance level and major areas of concern."
    },
    sectionAnalysis: {
        type: Type.ARRAY,
        description: "A comprehensive, section-by-section analysis of the MOE document. Every major section from the MOE must be listed.",
        items: {
            type: Type.OBJECT,
            properties: {
                moeSection: { type: Type.STRING, description: "The section number and title from the MOE (e.g., '2.1 Supplier Evaluation')." },
                status: { type: Type.STRING, description: "The compliance status for this section: 'Compliant', 'Non-Compliant', 'Partial', or 'Not Covered'." },
                summary: { type: Type.STRING, description: "A brief summary explaining the status. For 'Compliant', state what it covers well. For 'Non-Compliant' or 'Partial', explain the key issue." }
            },
            required: ["moeSection", "status", "summary"]
        }
    },
    nonConformities: {
        type: Type.ARRAY,
        description: "An array of objects, where each object represents a specific non-conformity or gap found when cross-referencing the MOE against the EASA Easy Access Rules.",
        items: {
            type: Type.OBJECT,
            properties: {
                regulationClause: { type: Type.STRING, description: "The specific clause number from the EASA regulation (e.g., '145.A.30')." },
                regulationText: { type: Type.STRING, description: "The full text of the relevant regulation clause." },
                manualReference: { type: Type.STRING, description: "The section in the MOE where the issue is found, or 'Not Found'." },
                finding: { type: Type.STRING, description: "A clear and detailed description of the non-conformity." },
                severity: { type: Type.STRING, description: "Assessed severity: 'High', 'Medium', or 'Low'." },
                recommendation: { type: Type.STRING, description: "A concrete, actionable recommendation on how to fix the non-conformity and achieve compliance." }
            },
            required: ["regulationClause", "regulationText", "manualReference", "finding", "severity", "recommendation"]
        }
    },
    questions: {
        type: Type.ARRAY,
        description: "An array of objects, where each object is a question for a human auditor based on ambiguities in the manual.",
        items: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING, description: "The text of the question." },
                regulationClause: { type: Type.STRING, description: "The EASA regulation clause the question relates to." },
                reasoning: { type: Type.STRING, description: "A brief explanation of why this question is necessary." }
            },
            required: ["question", "regulationClause", "reasoning"]
        }
    }
};

const versionChangeSchemaProperty = {
    versionChangeAnalysis: {
        type: Type.ARRAY,
        description: "An array analyzing the differences between the old and new regulations and checking if the manual has been updated accordingly.",
        items: {
            type: Type.OBJECT,
            properties: {
                clause: { type: Type.STRING, description: "The clause that has changed." },
                summaryOfChange: { type: Type.STRING, description: "A summary of what changed between the old and new regulation for this clause." },
                manualCoverage: { type: Type.STRING, description: "Analysis of whether the MOE manual correctly implements the change. State 'Covered', 'Partially Covered', or 'Not Covered'." },
                recommendation: { type: Type.STRING, description: "A recommendation for the auditor or the organization based on the finding." }
            },
            required: ["clause", "summaryOfChange", "manualCoverage", "recommendation"]
        }
    }
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Perform API call with retry logic and timeout
 */
async function callGeminiWithRetry(
    prompt: string,
    systemInstruction: string,
    responseSchema: any,
    maxRetries: number = MAX_RETRIES
): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`API call attempt ${attempt}/${maxRetries}`);

            // Create timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), API_TIMEOUT_MS);
            });

            // Race between API call and timeout
            const apiPromise = ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    temperature: 0.1,
                },
            });

            const response = await Promise.race([apiPromise, timeoutPromise]);
            return response.text.trim();

        } catch (error) {
            lastError = error as Error;
            console.warn(`Attempt ${attempt} failed:`, lastError.message);

            if (attempt < maxRetries) {
                const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                console.log(`Retrying in ${delay}ms...`);
                await sleep(delay);
            }
        }
    }

    throw lastError || new Error('Max retries exceeded');
}

export const performAudit = async (
    currentRegulationText: string,
    manualText: string,
    oldRegulationText?: string
): Promise<AuditResult> => {

    // Get current framework system prompt
    const frameworkSystemPrompt = FrameworkService.getCurrentSystemPrompt();
    const selectedFramework = FrameworkService.getSelectedFramework();

    // Check cache first
    const cacheKey = await cacheService.createCacheKey(
        currentRegulationText,
        manualText,
        oldRegulationText,
        selectedFramework
    );

    const cachedResult = cacheService.get<AuditResult>(cacheKey);
    if (cachedResult) {
        console.log('Using cached audit result');
        return cachedResult;
    }

    const hasVersionComparison = oldRegulationText && oldRegulationText.trim().length > 0;

    // Use framework-specific system prompt
    let systemInstruction = frameworkSystemPrompt;

    let prompt = `
        Here is the EASA Easy Access Rules document text:
        ---
        ${currentRegulationText}
        ---

        Here is the Maintenance Organisation Exposition (MOE) Document text:
        ---
        ${manualText}
        ---
    `;

    const responseSchema: any = {
        type: Type.OBJECT,
        properties: { ...baseSchemaProperties },
        required: ["summary", "sectionAnalysis", "nonConformities", "questions"]
    };

    if (hasVersionComparison) {
        systemInstruction += `\n\nVersion Change Analysis: Compare the current regulation to the PREVIOUS version provided. For each change, determine if the manual document has been updated to reflect it.`;

        prompt = `
            Here is the PREVIOUS Regulation Document Text:
            ---
            ${oldRegulationText}
            ---

            ${prompt}
        `;

        responseSchema.properties = { ...baseSchemaProperties, ...versionChangeSchemaProperty };
        responseSchema.required.push("versionChangeAnalysis");
    }

    systemInstruction += `\nYour response must be a single, valid JSON object that strictly adheres to the provided schema, with no additional commentary or explanation outside of the JSON structure.`;

    try {
        const jsonText = await callGeminiWithRetry(prompt, systemInstruction, responseSchema);

        if (!jsonText.startsWith('{') || !jsonText.endsWith('}')) {
            throw new Error('Received a malformed non-JSON response from the API.');
        }

        const parsedResult = JSON.parse(jsonText);

        if (!parsedResult.summary || !Array.isArray(parsedResult.nonConformities) || !Array.isArray(parsedResult.questions) || !Array.isArray(parsedResult.sectionAnalysis)) {
            throw new Error("API response is missing required fields (summary, sectionAnalysis, nonConformities, questions).");
        }

        // Cache the successful result
        cacheService.set(cacheKey, parsedResult);

        return parsedResult as AuditResult;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error && error.message.includes('json')) {
            throw new Error("Failed to parse the audit results from the AI. The response was not valid JSON.");
        }
        if (error instanceof Error && error.message.includes('timeout')) {
            throw new Error("The audit request timed out. Please try again or use smaller documents.");
        }
        throw new Error("An unexpected error occurred while communicating with the AI service. Please try again.");
    }
};
