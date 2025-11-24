import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SecurityFinding } from "./security-scanner";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Gemini function declarations for security analysis
 */
const securityAnalysisFunctions = [
    {
        name: 'report_sql_injection',
        description: 'Report a potential SQL injection vulnerability',
        parameters: {
            type: 'object' as const,
            properties: {
                file: { type: 'string', description: 'File path' },
                line: { type: 'number', description: 'Approximate line number' },
                code_snippet: { type: 'string', description: 'Vulnerable code snippet' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                explanation: { type: 'string', description: 'Why this is vulnerable' }
            },
            required: ['file', 'code_snippet', 'severity', 'explanation']
        }
    },
    {
        name: 'report_xss',
        description: 'Report a potential XSS (Cross-Site Scripting) vulnerability',
        parameters: {
            type: 'object' as const,
            properties: {
                file: { type: 'string', description: 'File path' },
                line: { type: 'number', description: 'Approximate line number' },
                code_snippet: { type: 'string', description: 'Vulnerable code snippet' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                explanation: { type: 'string', description: 'Why this is vulnerable' }
            },
            required: ['file', 'code_snippet', 'severity', 'explanation']
        }
    },
    {
        name: 'report_auth_issue',
        description: 'Report an authentication or authorization vulnerability',
        parameters: {
            type: 'object' as const,
            properties: {
                file: { type: 'string', description: 'File path' },
                line: { type: 'number', description: 'Approximate line number' },
                code_snippet: { type: 'string', description: 'Vulnerable code snippet' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                explanation: { type: 'string', description: 'What\'s wrong with the auth/authz' }
            },
            required: ['file', 'code_snippet', 'severity', 'explanation']
        }
    },
    {
        name: 'report_injection',
        description: 'Report a code injection, command injection, or path traversal vulnerability',
        parameters: {
            type: 'object' as const,
            properties: {
                file: { type: 'string', description: 'File path' },
                line: { type: 'number', description: 'Approximate line number' },
                code_snippet: { type: 'string', description: 'Vulnerable code snippet' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                injection_type: { type: 'string', enum: ['command', 'path_traversal', 'code', 'ldap'] },
                explanation: { type: 'string', description: 'How the injection could occur' }
            },
            required: ['file', 'code_snippet', 'severity', 'injection_type', 'explanation']
        }
    },
    {
        name: 'report_crypto_issue',
        description: 'Report insecure cryptography usage',
        parameters: {
            type: 'object' as const,
            properties: {
                file: { type: 'string', description: 'File path' },
                line: { type: 'number', description: 'Approximate line number' },
                code_snippet: { type: 'string', description: 'Problematic code' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                issue_type: { type: 'string', enum: ['weak_algorithm', 'hardcoded_key', 'no_encryption', 'insecure_random'] },
                explanation: { type: 'string', description: 'What\'s wrong with the crypto' }
            },
            required: ['file', 'code_snippet', 'severity', 'issue_type', 'explanation']
        }
    }
];

/**
 * Analyze code files with Gemini AI for security vulnerabilities
 */
export async function analyzeCodeWithGemini(
    files: Array<{ path: string; content: string }>
): Promise<SecurityFinding[]> {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            tools: [{ functionDeclarations: securityAnalysisFunctions as any }]
        });

        // Build analysis prompt
        const filesContext = files.map(f => `
--- FILE: ${f.path} ---
\`\`\`
${f.content.slice(0, 3000)} ${f.content.length > 3000 ? '... (truncated)' : ''}
\`\`\`
    `).join('\n');

        const prompt = `
You are a security expert analyzing code for vulnerabilities. Analyze these files and use the provided functions to report any security issues you find.

${filesContext}

Focus on finding:
1. **SQL Injection**: Unsanitized user input in SQL queries
2. **XSS (Cross-Site Scripting)**: Unsafe HTML rendering, innerHTML usage
3. **Authentication/Authorization flaws**: Missing auth checks, weak session management
4. **Injection vulnerabilities**: Command injection, path traversal, code injection
5. **Cryptography issues**: Weak algorithms (MD5, SHA1), hardcoded keys, insecure random

Only report HIGH-CONFIDENCE vulnerabilities. Be conservative - false alarms erode trust.
`;

        const result = await model.generateContent(prompt);
        const response = result.response;

        // Extract function calls
        const functionCalls = response.functionCalls?.() || [];

        const findings: SecurityFinding[] = functionCalls.map((call: any) => {
            const args = call.args as any;
            let title = '';
            let cwe = '';
            let recommendation = '';

            switch (call.name) {
                case 'report_sql_injection':
                    title = 'SQL Injection Vulnerability';
                    cwe = 'CWE-89';
                    recommendation = 'Use parameterized queries or prepared statements. Never concatenate user input into SQL.';
                    break;
                case 'report_xss':
                    title = 'Cross-Site Scripting (XSS)';
                    cwe = 'CWE-79';
                    recommendation = 'Sanitize user input and use secure DOM manipulation methods. Avoid innerHTML with user data.';
                    break;
                case 'report_auth_issue':
                    title = 'Authentication/Authorization Issue';
                    cwe = 'CWE-287';
                    recommendation = 'Implement proper authentication checks and use established auth libraries.';
                    break;
                case 'report_injection':
                    title = `${args.injection_type} Injection`;
                    cwe = args.injection_type === 'command' ? 'CWE-78' : 'CWE-22';
                    recommendation = 'Validate and sanitize all user input. Use safe APIs that don\'t accept shell commands.';
                    break;
                case 'report_crypto_issue':
                    title = `Cryptography Issue: ${args.issue_type}`;
                    cwe = 'CWE-327';
                    recommendation = 'Use modern cryptographic algorithms (AES-256, SHA-256+). Never hardcode keys.';
                    break;
            }

            return {
                type: 'code' as const,
                severity: args.severity,
                title,
                description: args.explanation,
                file: args.file,
                line: args.line,
                recommendation,
                cwe
            };
        });

        return findings;
    } catch (error) {
        console.error('Gemini security analysis error:', error);
        return [];
    }
}
