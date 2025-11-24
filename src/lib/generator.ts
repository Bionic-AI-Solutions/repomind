import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Generate documentation for code
 */
export async function generateDocumentation(
    code: string,
    type: 'jsdoc' | 'readme' | 'comments' = 'jsdoc'
): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
      Generate ${type.toUpperCase()} documentation for the following code.
      Return ONLY the documentation code block, no markdown wrappers if possible, or just the content.
      
      Code:
      ${code.slice(0, 5000)}
    `;

        const result = await model.generateContent(prompt);
        return result.response.text().replace(/```\w*\n/g, '').replace(/```$/g, '');
    } catch (error) {
        console.error('Doc generation failed:', error);
        return 'Failed to generate documentation.';
    }
}

/**
 * Generate unit tests
 */
export async function generateTests(
    code: string,
    framework: 'jest' | 'vitest' = 'jest'
): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
      Generate ${framework} unit tests for the following code.
      Include imports and mock setups if necessary.
      Return ONLY the test code.
      
      Code:
      ${code.slice(0, 5000)}
    `;

        const result = await model.generateContent(prompt);
        return result.response.text().replace(/```\w*\n/g, '').replace(/```$/g, '');
    } catch (error) {
        console.error('Test generation failed:', error);
        return '// Failed to generate tests.';
    }
}

/**
 * Suggest refactoring
 */
export async function suggestRefactoring(code: string): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
      Suggest a refactoring for this code to improve readability and performance.
      Explain the changes briefly and provide the refactored code.
      
      Code:
      ${code.slice(0, 5000)}
    `;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        return 'Failed to generate suggestions.';
    }
}
