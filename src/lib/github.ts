import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Optional for public repos, but good to have
});

// In-memory cache for the session
const profileCache = new Map<string, GitHubProfile>();
const repoCache = new Map<string, GitHubRepo>();

export interface GitHubProfile {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  owner: {
    login: string;
  };
  updated_at: string;
}

export interface FileNode {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export async function getProfile(username: string): Promise<GitHubProfile> {
  if (profileCache.has(username)) {
    return profileCache.get(username)!;
  }
  const { data } = await octokit.rest.users.getByUsername({
    username,
  });
  profileCache.set(username, data);
  return data;
}

export async function getRepo(owner: string, repo: string): Promise<GitHubRepo> {
  const cacheKey = `${owner}/${repo}`;
  if (repoCache.has(cacheKey)) {
    return repoCache.get(cacheKey)!;
  }
  const { data } = await octokit.rest.repos.get({
    owner,
    repo,
  });
  repoCache.set(cacheKey, data);
  return data;
}

export async function getRepoFileTree(owner: string, repo: string, branch: string = "main"): Promise<FileNode[]> {
  // Get the tree recursively
  // First, get the branch SHA
  let sha = branch;
  try {
    const { data: branchData } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch,
    });
    sha = branchData.commit.sha;
  } catch (e) {
    // If branch fetch fails, try to use the default branch from repo details or just let it fail later
    console.warn("Could not fetch branch details, trying with provided name/sha");
  }

  const { data } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: sha,
    recursive: "true",
  });

  const filteredTree = (data.tree as FileNode[]).filter((node) => {
    const path = node.path;
    return (
      !path.startsWith(".git/") &&
      !path.startsWith("node_modules/") &&
      !path.startsWith(".next/") &&
      !path.endsWith(".DS_Store") &&
      !path.endsWith(".lock")
      // Allowed: .vscode, .github, .idea for specific queries
    );
  });

  return filteredTree;
}

export async function getFileContent(owner: string, repo: string, path: string): Promise<string> {
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  if ("content" in data && !Array.isArray(data)) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  throw new Error("File is too large or is a directory");
}

/**
 * Fetch the user's profile README from their special <username>/<username> repo
 */
export async function getProfileReadme(username: string): Promise<string | null> {
  try {
    const content = await getFileContent(username, username, "README.md");
    return content;
  } catch (e) {
    // User doesn't have a profile README
    return null;
  }
}

/**
 * Get all public repositories for a user
 */
export async function getUserRepos(username: string): Promise<GitHubRepo[]> {
  try {
    const { data } = await octokit.rest.repos.listForUser({
      username,
      sort: "updated",
      per_page: 100, // Get up to 100 most recent repos
    });
    return data as any;
  } catch (e) {
    console.error("Failed to fetch user repos", e);
    return [];
  }
}

/**
 * Fetch README files from all of a user's public repositories
 * Returns an array of { repo: string, content: string }
 */
export async function getAllRepoReadmes(username: string): Promise<{ repo: string; content: string; updated_at: string; description: string | null }[]> {
  const repos = await getUserRepos(username);
  const readmes: { repo: string; content: string; updated_at: string; description: string | null }[] = [];

  // Limit to top 20 repos to avoid overwhelming context
  const topRepos = repos.slice(0, 20);

  for (const repo of topRepos) {
    try {
      const content = await getFileContent(username, repo.name, "README.md");
      readmes.push({
        repo: repo.name,
        content,
        updated_at: repo.updated_at,
        description: repo.description,
      });
    } catch (e) {
      // Repo doesn't have a README, skip it
      continue;
    }
  }

  return readmes;
}
