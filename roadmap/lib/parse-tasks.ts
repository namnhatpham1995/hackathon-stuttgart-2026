/**
 * Pure reader for the hackathon task list. Status rules are design.md Decision 10:
 * the first match wins.
 */

export type MilestoneDefinition = {
  id: string;
  title: string;
  target: string;
  groups: number[];
};

export type ParsedTask = {
  text: string;
  ticked: boolean;
  postMerge: boolean;
  blockedNotes: string[];
};

export type ParsedGroup = {
  number: number;
  title: string;
  wave: number | null;
  milestone: string;
  branch: string;
  tasks: ParsedTask[];
};

/** An open pull request, already fetched. `tasksMarkdown` is the head's tasks.md. */
export type OpenPullRequest = {
  number: number;
  url: string;
  isDraft: boolean;
  branch: string;
  updatedAt: string;
  lastCommitAt: string | null;
  tasksMarkdown: string | null;
};

export type GroupStatus =
  | "Blocked"
  | "Done"
  | "Merged, verifying"
  | "Ready to merge"
  | "In progress"
  | "Not started";

export type MilestoneStatus = "Done" | "Late" | "On track";

export type GroupView = {
  number: number;
  title: string;
  wave: number | null;
  milestone: string;
  branch: string;
  status: GroupStatus;
  ticked: number;
  total: number;
  blockedNotes: string[];
  pullRequest: {
    number: number;
    url: string;
    isDraft: boolean;
    updatedAt: string;
    lastCommitAt: string | null;
  } | null;
};

export type MilestoneView = {
  id: string;
  title: string;
  target: string;
  status: MilestoneStatus;
  groups: number[];
};

const HEADING = /^##\s+(\d+)\.\s+(.+?)\s+·\s+wave\s+(\d+)\s+·\s+(M\d+)\s+·\s+branch\s+(\S+)\s*$/;
const TASK_LINE = /^-\s+\[([^\]]*)\]\s+(.*)$/;
const BLOCKED_LINE = /^\s+-\s+Blocked:\s*(.*)$/;
const TICKED = /^\s*x\s*$/i;

export function parseTasks(markdown: string): ParsedGroup[] {
  const groups: ParsedGroup[] = [];
  let current: ParsedGroup | null = null;
  let task: ParsedTask | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const heading = HEADING.exec(line);
    if (heading?.[1] && heading[2] && heading[3] && heading[4] && heading[5]) {
      current = {
        number: Number(heading[1]),
        title: heading[2],
        wave: Number(heading[3]),
        milestone: heading[4],
        branch: heading[5],
        tasks: [],
      };
      groups.push(current);
      task = null;
      continue;
    }

    if (!current) continue;

    const taskMatch = TASK_LINE.exec(line);
    if (taskMatch?.[2] !== undefined) {
      const text = taskMatch[2];
      task = {
        text,
        ticked: TICKED.test(taskMatch[1] ?? ""),
        postMerge: text.includes("(post-merge)"),
        blockedNotes: [],
      };
      current.tasks.push(task);
      continue;
    }

    const blocked = BLOCKED_LINE.exec(line);
    if (blocked && task) {
      task.blockedNotes.push((blocked[1] ?? "").trim());
    }
  }

  return groups;
}

function counts(group: ParsedGroup): { ticked: number; total: number } {
  return {
    ticked: group.tasks.filter((item) => item.ticked).length,
    total: group.tasks.length,
  };
}

function allTicked(group: ParsedGroup): boolean {
  return group.tasks.length > 0 && group.tasks.every((item) => item.ticked);
}

/**
 * Every task that is not marked `(post-merge)` is ticked.
 * A heading with no tasks is not "verifying": there is nothing merged to check.
 */
function nonPostMergeTicked(group: ParsedGroup): boolean {
  if (group.tasks.length === 0) return false;
  return group.tasks.filter((item) => !item.postMerge).every((item) => item.ticked);
}

function notesOf(group: ParsedGroup): string[] {
  return group.tasks.flatMap((item) => item.blockedNotes);
}

function unique(notes: string[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const note of notes) {
    if (seen.has(note)) continue;
    seen.add(note);
    kept.push(note);
  }
  return kept;
}

function latestPullRequest(
  branch: string,
  pullRequests: OpenPullRequest[],
): OpenPullRequest | null {
  let latest: OpenPullRequest | null = null;
  for (const pullRequest of pullRequests) {
    if (pullRequest.branch !== branch) continue;
    if (!latest || pullRequest.updatedAt > latest.updatedAt) latest = pullRequest;
  }
  return latest;
}

function headGroup(main: ParsedGroup, pullRequest: OpenPullRequest | null): ParsedGroup | null {
  if (!pullRequest?.tasksMarkdown) return null;
  return (
    parseTasks(pullRequest.tasksMarkdown).find((group) => group.number === main.number) ?? null
  );
}

function groupStatus(
  main: ParsedGroup,
  head: ParsedGroup | null,
  pullRequest: OpenPullRequest | null,
  blockedNotes: string[],
): GroupStatus {
  if (blockedNotes.length > 0) return "Blocked";
  if (allTicked(main)) return "Done";
  if (nonPostMergeTicked(main) && pullRequest === null) return "Merged, verifying";
  if (pullRequest && !pullRequest.isDraft && head && nonPostMergeTicked(head)) {
    return "Ready to merge";
  }
  if (pullRequest) return "In progress";
  return "Not started";
}

export function milestoneStatus(
  groupStatuses: GroupStatus[],
  target: string,
  now: Date,
): MilestoneStatus {
  if (groupStatuses.length > 0 && groupStatuses.every((status) => status === "Done")) {
    return "Done";
  }
  if (now.getTime() > Date.parse(target)) return "Late";
  return "On track";
}

function missingGroup(number: number, milestone: string): ParsedGroup {
  return {
    number,
    title: "Missing from tasks.md",
    wave: null,
    milestone,
    branch: "",
    tasks: [],
  };
}

export function buildProgress(input: {
  mainMarkdown: string;
  pullRequests: OpenPullRequest[];
  milestones: MilestoneDefinition[];
  now: Date;
}): { milestones: MilestoneView[]; groups: GroupView[] } {
  const parsed = parseTasks(input.mainMarkdown);
  const byNumber = new Map(parsed.map((group) => [group.number, group]));
  const milestoneByGroup = new Map<number, string>();
  const numbers = new Set(parsed.map((group) => group.number));
  for (const milestone of input.milestones) {
    for (const number of milestone.groups) {
      numbers.add(number);
      milestoneByGroup.set(number, milestone.id);
    }
  }

  const groups = [...numbers]
    .sort((left, right) => left - right)
    .map((number): GroupView => {
      const main = byNumber.get(number) ?? missingGroup(number, milestoneByGroup.get(number) ?? "");
      const pullRequest = main.branch ? latestPullRequest(main.branch, input.pullRequests) : null;
      const head = headGroup(main, pullRequest);
      const blockedNotes = unique([...notesOf(main), ...(head ? notesOf(head) : [])]);
      const status = groupStatus(main, head, pullRequest, blockedNotes);
      const shown = status !== "Done" && head ? head : main;
      const progress = counts(shown);
      return {
        number: main.number,
        title: main.title,
        wave: main.wave,
        milestone: main.milestone,
        branch: main.branch,
        status,
        ticked: progress.ticked,
        total: progress.total,
        blockedNotes,
        pullRequest: pullRequest
          ? {
              number: pullRequest.number,
              url: pullRequest.url,
              isDraft: pullRequest.isDraft,
              updatedAt: pullRequest.updatedAt,
              lastCommitAt: pullRequest.lastCommitAt,
            }
          : null,
      };
    });

  const groupByNumber = new Map(groups.map((group) => [group.number, group]));
  const milestones = input.milestones.map((milestone): MilestoneView => {
    const statuses = milestone.groups.map(
      (number) => groupByNumber.get(number)?.status ?? "Not started",
    );
    return {
      id: milestone.id,
      title: milestone.title,
      target: milestone.target,
      status: milestoneStatus(statuses, milestone.target, input.now),
      groups: milestone.groups,
    };
  });

  return { milestones, groups };
}
