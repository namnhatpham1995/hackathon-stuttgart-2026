/**
 * Read-only progress for the roadmap page. GITHUB_TOKEN stays in this process:
 * it is sent only as a GitHub Authorization header and is removed from every response.
 */

import { buildProgress, type MilestoneDefinition, type OpenPullRequest } from "../lib/parse-tasks.js";
import milestoneFile from "../milestones.json" with { type: "json" };

const GITHUB_OWNER = "namnhatpham1995";
const GITHUB_REPO = "hackathon-stuttgart-2026";
const TASKS_PATH = "openspec/changes/exportready-hackathon-build/tasks.md";
const CACHE_CONTROL = "s-maxage=20, stale-while-revalidate=60";
const NO_PULLS = "Open pull requests are not shown.";

const ROADMAP_QUERY = `
  query Roadmap($owner: String!, $name: String!, $path: String!) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            file(path: $path) {
              object { ... on Blob { text } }
            }
          }
        }
      }
      pullRequests(states: OPEN, first: 50, orderBy: { field: UPDATED_AT, direction: DESC }) {
        pageInfo { hasNextPage }
        nodes {
          number
          url
          isDraft
          headRefName
          updatedAt
          headRef {
            target {
              ... on Commit {
                committedDate
                file(path: $path) {
                  object { ... on Blob { text } }
                }
              }
            }
          }
        }
      }
    }
  }
`;

type Loaded = {
  source: "github" | "raw";
  mainMarkdown: string;
  pullRequests: OpenPullRequest[];
  openPullRequestsShown: boolean;
  notice: string | null;
};

function milestones(): MilestoneDefinition[] {
  return milestoneFile.milestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    target: milestone.target,
    groups: [...milestone.groups],
  }));
}

function redact(text: string, token: string): string {
  if (token.length < 8) return text;
  return text.split(token).join("[redacted]");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function blobText(file: unknown): string | null {
  const object = asRecord(asRecord(file)?.object);
  return typeof object?.text === "string" ? object.text : null;
}

function jsonResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? CACHE_CONTROL : "no-store",
    },
  });
}

async function githubGraphql(token: string): Promise<unknown> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "tradeready-roadmap",
    },
    body: JSON.stringify({
      query: ROADMAP_QUERY,
      variables: { owner: GITHUB_OWNER, name: GITHUB_REPO, path: TASKS_PATH },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`GitHub GraphQL failed (${response.status})`);
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new Error("GitHub returned invalid JSON");
  }
}

function readRepository(payload: unknown): {
  markdown: string;
  pullRequests: OpenPullRequest[];
  truncated: boolean;
} {
  const root = asRecord(payload);
  const errors = Array.isArray(root?.errors) ? root.errors : [];
  if (errors.length > 0) {
    const message = errors
      .map((entry) => {
        const record = asRecord(entry);
        return typeof record?.message === "string" ? record.message : "GitHub GraphQL error";
      })
      .join("; ");
    throw new Error(message);
  }

  const repository = asRecord(asRecord(root?.data)?.repository);
  if (!repository) throw new Error("GitHub did not return the repository");

  const target = asRecord(asRecord(repository.defaultBranchRef)?.target);
  const markdown = blobText(target?.file);
  if (markdown === null) throw new Error("tasks.md is missing on main");

  const connection = asRecord(repository.pullRequests);
  const truncated = asRecord(connection?.pageInfo)?.hasNextPage === true;
  const nodes = Array.isArray(connection?.nodes) ? connection.nodes : [];
  const pullRequests: OpenPullRequest[] = [];
  for (const node of nodes) {
    const pullRequest = asRecord(node);
    if (!pullRequest) continue;
    const { number, url, headRefName, updatedAt } = pullRequest;
    if (
      typeof number !== "number" ||
      typeof url !== "string" ||
      typeof headRefName !== "string" ||
      typeof updatedAt !== "string"
    ) {
      continue;
    }
    const head = asRecord(asRecord(pullRequest.headRef)?.target);
    pullRequests.push({
      number,
      url,
      isDraft: pullRequest.isDraft === true,
      branch: headRefName,
      updatedAt,
      lastCommitAt: typeof head?.committedDate === "string" ? head.committedDate : null,
      tasksMarkdown: blobText(head?.file),
    });
  }

  return { markdown, pullRequests, truncated };
}

async function loadFromGitHub(token: string): Promise<Loaded> {
  const { markdown, pullRequests, truncated } = readRepository(await githubGraphql(token));
  return {
    source: "github",
    mainMarkdown: markdown,
    pullRequests,
    openPullRequestsShown: true,
    notice: truncated ? "Some open pull requests were not loaded." : null,
  };
}

async function loadFromRaw(): Promise<Loaded> {
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${TASKS_PATH}`;
  const response = await fetch(url, {
    headers: { accept: "text/plain", "user-agent": "tradeready-roadmap" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Could not read tasks.md from main (${response.status})`);
  const mainMarkdown = await response.text();
  if (!mainMarkdown.includes("## ")) {
    throw new Error("tasks.md from main did not contain any group headings");
  }
  return {
    source: "raw",
    mainMarkdown,
    pullRequests: [],
    openPullRequestsShown: false,
    notice: NO_PULLS,
  };
}

export async function GET(): Promise<Response> {
  const token = process.env.GITHUB_TOKEN?.trim() ?? "";
  try {
    const loaded = token ? await loadFromGitHub(token) : await loadFromRaw();
    const progress = buildProgress({
      mainMarkdown: loaded.mainMarkdown,
      pullRequests: loaded.pullRequests,
      milestones: milestones(),
      now: new Date(),
    });
    const body = JSON.stringify({
      fetchedAt: new Date().toISOString(),
      source: loaded.source,
      openPullRequestsShown: loaded.openPullRequestsShown,
      notice: loaded.notice,
      milestones: progress.milestones,
      groups: progress.groups,
    });
    return jsonResponse(redact(body, token), 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub request failed";
    return jsonResponse(redact(JSON.stringify({ error: redact(message, token) }), token), 502);
  }
}
