import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  request: {
    fetch: (url: string, options: any) => {
      return fetch(url, {
        ...options,
        cache: "no-store",
        next: { revalidate: 0 }
      });
    },
  },
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

export async function getRepoFileTree(owner: string, repo: string, branch: string = "main"): Promise<{ tree: FileNode[], hiddenFiles: { path: string; reason: string }[] }> {
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

  const hiddenFiles: { path: string; reason: string }[] = [];

  const filteredTree = (data.tree as FileNode[]).filter((node) => {
    const path = node.path;

    // Basic exclusions
    if (path.startsWith(".git/") || path === ".git") {
      hiddenFiles.push({ path, reason: "Git System Directory" });
      return false;
    }
    if (path.startsWith("node_modules/") || path === "node_modules") {
      hiddenFiles.push({ path, reason: "Dependencies" });
      return false;
    }
    if (path.startsWith(".next/") || path === ".next") {
      hiddenFiles.push({ path, reason: "Next.js Build Output" });
      return false;
    }
    if (path.startsWith(".idx/") || path === ".idx") {
      hiddenFiles.push({ path, reason: "Project Index" });
      return false;
    }
    if (path.startsWith(".vscode/") || path === ".vscode") {
      hiddenFiles.push({ path, reason: "VS Code Configuration" });
      return false;
    }
    if (path.endsWith(".DS_Store")) {
      hiddenFiles.push({ path, reason: "macOS System File" });
      return false;
    }

    return true;
  });

  return { tree: filteredTree, hiddenFiles };
}

/**
 * GraphQL query for repository details
 */
const REPO_DETAILS_QUERY = `
  query RepoDetails($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
        totalSize
        edges {
          size
          node {
            name
            color
          }
        }
      }
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: 20) {
              edges {
                node {
                  message
                  committedDate
                  author {
                    name
                    avatarUrl
                    user {
                      login
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetch enhanced repository details using GraphQL
 */
export async function getRepoDetailsGraphQL(owner: string, repo: string) {
  const { graphql } = await import("@octokit/graphql");

  try {
    const data: any = await graphql(REPO_DETAILS_QUERY, {
      owner,
      name: repo,
      headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });

    const languages = data.repository.languages.edges.map((edge: any) => ({
      name: edge.node.name,
      color: edge.node.color,
      size: edge.size,
      percentage: ((edge.size / data.repository.languages.totalSize) * 100).toFixed(1)
    }));

    const commits = data.repository.defaultBranchRef.target.history.edges.map((edge: any) => ({
      message: edge.node.message,
      date: edge.node.committedDate,
      author: {
        name: edge.node.author.name,
        login: edge.node.author.user?.login,
        avatar: edge.node.author.avatarUrl
      }
    }));

    return {
      languages,
      commits,
      totalSize: data.repository.languages.totalSize
    };
  } catch (error) {
    console.error("GraphQL fetch failed:", error);
    return null;
  }
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string
) {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if ("content" in data && !Array.isArray(data)) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    throw new Error("Not a file");
  } catch (error) {
    console.error("Error fetching file content:", error);
    throw error;
  }
}

export async function getProfileReadme(username: string) {
  try {
    const { data } = await octokit.rest.repos.getReadme({
      owner: username,
      repo: username,
    });
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch (error) {
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
 * Get READMEs for a user's repositories
 */
export async function getReposReadmes(username: string) {
  try {
    const repos = await getUserRepos(username);

    const readmePromises = repos.map(async (repo) => {
      try {
        const { data } = await octokit.rest.repos.getReadme({
          owner: username,
          repo: repo.name,
        });
        return {
          repo: repo.name,
          content: Buffer.from(data.content, "base64").toString("utf-8"),
          updated_at: repo.updated_at,
          description: repo.description,
        };
      } catch (e) {
        return null;
      }
    });

    const results = await Promise.all(readmePromises);
    return results.filter((r) => r !== null) as {
      repo: string;
      content: string;
      updated_at: string;
      description: string | null;
    }[];
  } catch (error) {
    console.error("Error fetching repos:", error);
    return [];
  }
}
