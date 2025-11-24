import { encode } from 'gpt-tokenizer';

/**
 * Count tokens in a string using GPT tokenizer
 * (Works well for Gemini models too as they use similar tokenization)
 */
export function countTokens(text: string): number {
    try {
        return encode(text).length;
    } catch (error) {
        // Fallback: rough estimate (4 chars ≈ 1 token)
        return Math.ceil(text.length / 4);
    }
}

/**
 * Count tokens in an array of messages
 */
export function countMessageTokens(messages: { role: string; parts: string }[]): number {
    return messages.reduce((total, msg) => {
        return total + countTokens(msg.parts);
    }, 0);
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(2)}M`;
    } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
}

/**
 * Get warning level based on token usage
 * Gemini 2.5 Flash has 1M context window
 */
export function getTokenWarningLevel(tokenCount: number): 'safe' | 'warning' | 'danger' {
    const MAX_TOKENS = 1_000_000;
    const percentage = (tokenCount / MAX_TOKENS) * 100;

    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'safe';
}

/**
 * Check if a rate limit error occurred
 */
export function isRateLimitError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorStatus = error.status || error.response?.status;

    return (
        errorStatus === 429 ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('quota exceeded')
    );
}

/**
 * Get user-friendly error message
 */
export function getRateLimitErrorMessage(error: any): string {
    if (error.message?.includes('GitHub')) {
        return 'GitHub API rate limit exceeded. Please try again in a few minutes.';
    }
    if (error.message?.includes('Gemini') || error.message?.includes('generative')) {
        return 'AI service rate limit exceeded. Please try again in a moment.';
    }
    return 'Rate limit exceeded. Please try again shortly.';
}
