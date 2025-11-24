"use server";

import { getProfile, getRepo, getRepoFileTree, getFileContent, getProfileReadme, getReposReadmes } from "@/lib/github";
import { analyzeFileSelection, answerWithContext } from "@/lib/gemini";
import { scanFiles, getScanSummary, groupBySeverity, type SecurityFinding, type ScanSummary } from "@/lib/security-scanner";
import { analyzeCodeWithGemini } from "@/lib/gemini-security";

export async function fetchGitHubData(input: string) {
    // Input format: "username" or "owner/repo"
    const parts = input.split("/");

    if (parts.length === 1) {
        // Profile Mode
        const username = parts[0];
        try {
            // We just return basic profile info here for the initial load
            // The rest will be loaded by the client component
            const profile = await getProfile(username);
            return { type: "profile", data: profile };
        } catch (e) {
            return { error: "User not found" };
        }
    } else if (parts.length === 2) {
        // Repo Mode
        const [owner, repo] = parts;
        try {
            const repoData = await getRepo(owner, repo);
            // Use the default branch from the repo data to avoid phantom files from stale 'main' branches
            const { tree, hiddenFiles } = await getRepoFileTree(owner, repo, repoData.default_branch);
            return { type: "repo", data: repoData, fileTree: tree, hiddenFiles };
        } catch (e) {
            return { error: "Repository not found" };
        }
    }

    return { error: "Invalid input format" };
}

export async function fetchProfile(username: string) {
    return await getProfile(username);
}

export async function fetchProfileReadme(username: string) {
    return await getProfileReadme(username);
}

export async function fetchUserRepos(username: string) {
    return await getReposReadmes(username);
}

export async function fetchRepoDetails(owner: string, repo: string) {
    return await getRepo(owner, repo);
}

export async function processChatQuery(
    query: string,
    repoContext: { owner: string; repo: string; filePaths: string[] }
) {
    // 1. Agentic Selection: Which files do we need?
    const filePaths = repoContext.filePaths;
    const relevantFiles = await analyzeFileSelection(query, filePaths);

    // 2. Retrieval: Fetch content of relevant files
    let context = "";
    for (const file of relevantFiles) {
        try {
            const content = await getFileContent(repoContext.owner, repoContext.repo, file);
            context += `\n--- FILE: ${file} ---\n${content}\n`;
        } catch (e) {
            console.warn(`Failed to fetch ${file}`, e);
        }
    }

    // 3. Synthesis: Answer the question
    if (!context) {
        // If no files selected, try to answer generally or say we need more info
        context = "No specific files were selected. Answer based on general knowledge or explain that you need to check specific files.";
    }

    const answer = await answerWithContext(query, context, { owner: repoContext.owner, repo: repoContext.repo });
    return { answer, relevantFiles };
}

export async function processProfileQuery(
    query: string,
    profileContext: {
        username: string;
        profile: any; // Full GitHub profile object
        profileReadme: string | null;
        repoReadmes: { repo: string; content: string; updated_at: string; description: string | null }[]
    }
) {
    // Build context from profile data, README and repo READMEs
    let context = "";

    // Add profile metadata first
    context += `\n--- GITHUB PROFILE METADATA ---\n`;
    context += `Username: ${profileContext.profile.login}\n`;
    context += `Name: ${profileContext.profile.name || 'N/A'}\n`;
    context += `Bio: ${profileContext.profile.bio || 'N/A'}\n`;
    context += `Location: ${profileContext.profile.location || 'N/A'}\n`;
    context += `Blog/Website: ${profileContext.profile.blog || 'N/A'}\n`;
    context += `Avatar URL: ${profileContext.profile.avatar_url}\n`;
    context += `Public Repos: ${profileContext.profile.public_repos}\n`;
    context += `Followers: ${profileContext.profile.followers}\n`;
    context += `Following: ${profileContext.profile.following}\n\n`;

    if (profileContext.profileReadme) {
        context += `\n--- ${profileContext.username}'S PROFILE README ---\n${profileContext.profileReadme}\n\n`;
    }

    // Add repo READMEs
    for (const readme of profileContext.repoReadmes) {
        context += `\n--- REPO: ${readme.repo} ---\nLast Updated: ${readme.updated_at}\nDescription: ${readme.description || 'N/A'}\n\nREADME Content:\n${readme.content}\n\n`;
    }

    if (!context) {
        context = `No profile README or repository READMEs found for ${profileContext.username}.`;
    }

    // Answer using profile context, passing profile data for developer cards
    const answer = await answerWithContext(
        query,
        context,
        { owner: profileContext.username, repo: "profile" },
        profileContext.profile // Pass profile data
    );
    return { answer };
}

/**
 * Scan repository for security vulnerabilities
 * Uses pattern-based detection + Gemini AI analysis
 */
export async function scanRepositoryVulnerabilities(
    owner: string,
    repo: string,
    filePaths: string[]
): Promise<{ findings: SecurityFinding[]; summary: ScanSummary; grouped: Record<string, SecurityFinding[]> }> {
    try {
        // Select relevant files for security scanning (focus on code files)
        const codeFiles = filePaths.filter(path =>
            /\.(js|jsx|ts|tsx|py|java|php|rb|go|rs)$/i.test(path) || path === 'package.json'
        ).slice(0, 20); // Limit to 20 files for performance

        // Fetch file contents
        const filesWithContent: Array<{ path: string; content: string }> = [];
        for (const filePath of codeFiles) {
            try {
                const content = await getFileContent(owner, repo, filePath);
                filesWithContent.push({ path: filePath, content });
            } catch (e) {
                console.warn(`Failed to fetch ${filePath} for security scan`);
            }
        }

        // Pattern-based scanning (fast, zero API costs)
        const patternFindings = scanFiles(filesWithContent);

        // AI-powered analysis (more thorough, uses Gemini)
        const aiFindings = await analyzeCodeWithGemini(filesWithContent);

        // Combine findings (deduplicate if needed)
        const allFindings = [...patternFindings, ...aiFindings];

        // Get summary and grouped results
        const summary = getScanSummary(allFindings);
        const grouped = groupBySeverity(allFindings);

        return { findings: allFindings, summary, grouped };
    } catch (error) {
        console.error('Vulnerability scanning error:', error);
        throw new Error('Failed to scan repository for vulnerabilities');
    }
}

// --- Final Phase Actions ---

import { analyzeCodeQuality, type QualityReport } from "@/lib/quality-analyzer";
import { searchFiles, type SearchResult, type SearchOptions } from "@/lib/search-engine";
import { generateDocumentation, generateTests, suggestRefactoring } from "@/lib/generator";

export async function analyzeFileQuality(owner: string, repo: string, path: string): Promise<QualityReport | null> {
    try {
        const content = await getFileContent(owner, repo, path);
        return await analyzeCodeQuality(content, path);
    } catch (error) {
        console.error("Quality analysis failed:", error);
        return null;
    }
}

export async function searchRepositoryCode(
    owner: string,
    repo: string,
    filePaths: string[],
    query: string,
    type: 'text' | 'regex' | 'ast' = 'text'
): Promise<SearchResult[]> {
    try {
        // Limit search to 50 files to prevent timeout
        const searchFilesList = filePaths.slice(0, 50);
        const filesWithContent = [];

        for (const path of searchFilesList) {
            try {
                // Skip non-code files for AST search
                if (type === 'ast' && !/\.(js|jsx|ts|tsx)$/.test(path)) continue;

                const content = await getFileContent(owner, repo, path);
                filesWithContent.push({ path, content });
            } catch (e) {
                // Skip failed files
            }
        }

        return searchFiles(filesWithContent, { query, type });
    } catch (error) {
        console.error("Search failed:", error);
        return [];
    }
}

export async function generateArtifact(
    owner: string,
    repo: string,
    path: string,
    type: 'doc' | 'test' | 'refactor'
): Promise<string> {
    try {
        const content = await getFileContent(owner, repo, path);

        switch (type) {
            case 'doc':
                return await generateDocumentation(content);
            case 'test':
                return await generateTests(content);
            case 'refactor':
                return await suggestRefactoring(content);
            default:
                return "Invalid type";
        }
    } catch (error) {
        return "Failed to generate artifact";
    }
}
