import { readFileSync } from "node:fs";

import { expect, test } from "vitest";

import {
  buildProgress,
  type MilestoneDefinition,
  type OpenPullRequest,
  parseTasks,
} from "./parse-tasks";

const tasksPath = new URL(
  "../../openspec/changes/exportready-hackathon-build/tasks.md",
  import.meta.url,
);

function milestone(
  id: string,
  groups: number[],
  target = "2026-11-07T18:00:00+01:00",
): MilestoneDefinition {
  return { id, title: id, target, groups };
}

function pullRequest(
  branch: string,
  tasksMarkdown: string,
  overrides: Partial<OpenPullRequest> = {},
): OpenPullRequest {
  return {
    number: 12,
    url: "https://github.com/namnhatpham1995/hackathon-stuttgart-2026/pull/12",
    isDraft: false,
    branch,
    updatedAt: "2026-11-07T10:00:00Z",
    lastCommitAt: "2026-11-07T09:50:00Z",
    tasksMarkdown,
    ...overrides,
  };
}

function progress(
  mainMarkdown: string,
  options: {
    pullRequests?: OpenPullRequest[];
    milestones?: MilestoneDefinition[];
    now?: Date;
  } = {},
) {
  return buildProgress({
    mainMarkdown,
    pullRequests: options.pullRequests ?? [],
    milestones: options.milestones ?? [milestone("M0", [1])],
    now: options.now ?? new Date("2026-11-07T12:00:00+01:00"),
  });
}

test("counts [x], [X] and [ x] as ticked", () => {
  const [group] = parseTasks(`## 1. Example · wave 0 · M0 · branch chore/example
- [x] 1.1 one
- [X] 1.2 two
- [ x] 1.3 three
- [ ] 1.4 four
`);

  expect(group?.tasks.map((item) => item.ticked)).toEqual([true, true, true, false]);
});

test("reads the group number, title, wave, milestone and branch from the heading", () => {
  const [group] = parseTasks(`## 4. Demo fixtures · wave 1 · M0 · branch feat/demo-fixtures
- [ ] 4.1 writer
`);

  expect(group).toMatchObject({
    number: 4,
    title: "Demo fixtures",
    wave: 1,
    milestone: "M0",
    branch: "feat/demo-fixtures",
  });
});

test("reads every group heading in the change task list", () => {
  const groups = parseTasks(readFileSync(tasksPath, "utf8"));

  expect(groups.map((group) => group.number)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
    27, 28, 29,
  ]);
  expect(groups.find((group) => group.number === 1)?.wave).toBe(0);
  expect(groups.find((group) => group.number === 2)).toMatchObject({
    title: "Live roadmap page",
    wave: 1,
    milestone: "M0",
    branch: "feat/live-roadmap",
  });
});

test("shows a merged group as Done with its full task count", () => {
  const markdown = `## 4. Demo fixtures · wave 1 · M0 · branch feat/demo-fixtures
- [x] 4.1 writer
- [x] 4.2 files
- [x] 4.3 traps
- [x] 4.4 answer key
`;
  const view = progress(markdown, {
    milestones: [milestone("M0", [4])],
    pullRequests: [
      pullRequest(
        "feat/demo-fixtures",
        `## 4. Demo fixtures · wave 1 · M0 · branch feat/demo-fixtures
- [x] 4.1 writer
- [ ] 4.2 files
- [ ] 4.3 traps
- [ ] 4.4 answer key
`,
        { isDraft: true },
      ),
    ],
  });
  const group = view.groups[0];

  expect(view.groups).toHaveLength(1);
  expect(group?.status).toBe("Done");
  expect(group?.ticked).toBe(4);
  expect(group?.total).toBe(4);
});

test("shows Done when the post-merge task is ticked too", () => {
  const view = progress(
    `## 12. Production deploy · wave 2 · M1 · branch chore/production-deploy
- [x] 12.1 build
- [x] 12.2 docs
- [x] 12.4 (post-merge) smoke
`,
    { milestones: [milestone("M1", [12])] },
  );

  expect(view.groups[0]?.status).toBe("Done");
  expect(view.groups[0]?.ticked).toBe(3);
  expect(view.groups[0]?.total).toBe(3);
});

test("shows Merged, verifying when only a post-merge task remains and no pull request is open", () => {
  const view = progress(
    `## 12. Production deploy · wave 2 · M1 · branch chore/production-deploy
- [x] 12.1 build
- [x] 12.2 docs
- [ ] 12.4 (post-merge) smoke
`,
    {
      milestones: [milestone("M1", [12])],
      pullRequests: [
        pullRequest(
          "feat/other",
          `## 1. Other · wave 0 · M0 · branch feat/other
- [ ] 1.1 something
`,
        ),
      ],
    },
  );

  expect(view.groups[0]?.status).toBe("Merged, verifying");
  expect(view.groups[0]?.ticked).toBe(2);
  expect(view.groups[0]?.total).toBe(3);
  expect(view.groups[0]?.pullRequest).toBeNull();
});

test("shows an untouched group as Not started", () => {
  const view = progress(
    `## 15. Spoken replies · wave 4 · M4 · branch feat/spoken-replies
- [ ] 15.1 speech
  - Note: not a blocker
- [ ] 15.2 mount
`,
    { milestones: [milestone("M4", [15])] },
  );
  const group = view.groups[0];

  expect(group?.status).toBe("Not started");
  expect(group?.ticked).toBe(0);
  expect(group?.total).toBe(2);
  expect(group?.blockedNotes).toEqual([]);
});

test("shows a draft pull request as In progress at the head's 2/4", () => {
  const main = `## 7. Rules and citation checks · wave 2 · M1 · branch feat/rules-engine
- [ ] 7.1 citations
- [ ] 7.2 rules
- [ ] 7.3 review
- [ ] 7.4 extra
`;
  const head = `## 7. Rules and citation checks · wave 2 · M1 · branch feat/rules-engine
- [x] 7.1 citations
- [X] 7.2 rules
- [ ] 7.3 review
- [ ] 7.4 extra
`;
  const view = progress(main, {
    milestones: [milestone("M1", [7])],
    pullRequests: [
      pullRequest("feat/other", main, { number: 99, isDraft: true }),
      pullRequest("feat/rules-engine", head, { number: 31, isDraft: true }),
    ],
  });
  const group = view.groups[0];

  expect(group?.status).toBe("In progress");
  expect(group?.ticked).toBe(2);
  expect(group?.total).toBe(4);
  expect(group?.pullRequest?.number).toBe(31);
  expect(group?.pullRequest?.isDraft).toBe(true);
});

test("shows a ready pull request with every task ticked as Ready to merge", () => {
  const head = `## 7. Rules and citation checks · wave 2 · M1 · branch feat/rules-engine
- [x] 7.1 citations
- [x] 7.2 rules
- [x] 7.3 review
- [x] 7.4 extra
`;
  const view = progress(
    `## 7. Rules and citation checks · wave 2 · M1 · branch feat/rules-engine
- [ ] 7.1 citations
- [ ] 7.2 rules
- [ ] 7.3 review
- [ ] 7.4 extra
`,
    {
      milestones: [milestone("M1", [7])],
      pullRequests: [pullRequest("feat/rules-engine", head, { isDraft: false })],
    },
  );

  expect(view.groups[0]?.status).toBe("Ready to merge");
  expect(view.groups[0]?.ticked).toBe(4);
  expect(view.groups[0]?.total).toBe(4);
  expect(view.groups[0]?.pullRequest?.isDraft).toBe(false);
});

test("shows Ready to merge when the only unticked head task is post-merge", () => {
  const head = `## 2. Live roadmap page · wave 1 · M0 · branch feat/live-roadmap
- [x] 2.1 milestones
- [x] 2.2 parser
- [ ] 2.6 (post-merge) owner step
`;
  const view = progress(
    `## 2. Live roadmap page · wave 1 · M0 · branch feat/live-roadmap
- [ ] 2.1 milestones
- [ ] 2.2 parser
- [ ] 2.6 (post-merge) owner step
`,
    {
      milestones: [milestone("M0", [2])],
      pullRequests: [pullRequest("feat/live-roadmap", head, { isDraft: false })],
    },
  );

  expect(view.groups[0]?.status).toBe("Ready to merge");
  expect(view.groups[0]?.ticked).toBe(2);
  expect(view.groups[0]?.total).toBe(3);
});

test("keeps a draft in progress when every non-post-merge task is ticked", () => {
  const head = `## 2. Live roadmap page · wave 1 · M0 · branch feat/live-roadmap
- [x] 2.1 milestones
- [x] 2.2 parser
- [ ] 2.6 (post-merge) owner step
`;
  const view = progress(
    `## 2. Live roadmap page · wave 1 · M0 · branch feat/live-roadmap
- [ ] 2.1 milestones
- [ ] 2.2 parser
- [ ] 2.6 (post-merge) owner step
`,
    {
      milestones: [milestone("M0", [2])],
      pullRequests: [pullRequest("feat/live-roadmap", head, { isDraft: true })],
    },
  );

  expect(view.groups[0]?.status).toBe("In progress");
});

test("does not say Merged, verifying while a pull request for the branch is open", () => {
  const main = `## 12. Production deploy · wave 2 · M1 · branch chore/production-deploy
- [x] 12.1 build
- [ ] 12.4 (post-merge) smoke
`;
  const view = progress(main, {
    milestones: [milestone("M1", [12])],
    pullRequests: [pullRequest("chore/production-deploy", main, { isDraft: true })],
  });

  expect(view.groups[0]?.status).toBe("In progress");
});

test("shows a blocked note from the pull request head", () => {
  const main = `## 9. Assessment jobs · wave 2 · M1 · branch feat/assessment-jobs
- [x] 9.1 start
- [ ] 9.3 read
`;
  const head = `## 9. Assessment jobs · wave 2 · M1 · branch feat/assessment-jobs
- [x] 9.1 start
- [ ] 9.3 read
  - Blocked: Brevo sender not verified
`;
  const view = progress(main, {
    milestones: [milestone("M1", [9])],
    pullRequests: [pullRequest("feat/assessment-jobs", head)],
  });

  expect(view.groups[0]?.status).toBe("Blocked");
  expect(view.groups[0]?.blockedNotes).toEqual(["Brevo sender not verified"]);
});

test("shows a blocked note that is only on main", () => {
  const view = progress(
    `## 9. Assessment jobs · wave 2 · M1 · branch feat/assessment-jobs
- [x] 9.1 start
- [ ] 9.3 read
  - Blocked: Brevo sender not verified
`,
    { milestones: [milestone("M1", [9])] },
  );

  expect(view.groups[0]?.status).toBe("Blocked");
  expect(view.groups[0]?.blockedNotes).toEqual(["Brevo sender not verified"]);
});

test("marks a milestone Late after its target while a group is in progress", () => {
  const target = "2026-11-07T10:45:00+01:00";
  const main = `## 7. Rules and citation checks · wave 2 · M1 · branch feat/rules-engine
- [ ] 7.1 citations
- [ ] 7.2 rules
`;
  const head = `## 7. Rules and citation checks · wave 2 · M1 · branch feat/rules-engine
- [x] 7.1 citations
- [ ] 7.2 rules
`;
  const view = progress(main, {
    milestones: [milestone("M1", [7], target)],
    pullRequests: [pullRequest("feat/rules-engine", head, { isDraft: true })],
    now: new Date("2026-11-07T11:00:00+01:00"),
  });

  expect(view.groups[0]?.status).toBe("In progress");
  expect(view.milestones[0]?.status).toBe("Late");
});

test("keeps a milestone On track at the exact target time", () => {
  const target = "2026-11-07T10:45:00+01:00";
  const view = progress(
    `## 7. Rules and citation checks · wave 2 · M1 · branch feat/rules-engine
- [ ] 7.1 citations
`,
    {
      milestones: [milestone("M1", [7], target)],
      now: new Date(target),
    },
  );

  expect(view.milestones[0]?.status).toBe("On track");
});

test("marks a milestone Done when every group is Done, even after the target", () => {
  const view = progress(
    `## 4. Demo fixtures · wave 1 · M0 · branch feat/demo-fixtures
- [x] 4.1 writer
- [x] 4.2 files
`,
    {
      milestones: [milestone("M0", [4], "2026-11-07T10:45:00+01:00")],
      now: new Date("2026-11-07T12:00:00+01:00"),
    },
  );

  expect(view.groups[0]?.status).toBe("Done");
  expect(view.milestones[0]?.status).toBe("Done");
});

test("does not mark a milestone Done when one of its groups is missing from tasks.md", () => {
  const view = progress(
    `## 4. Demo fixtures · wave 1 · M0 · branch feat/demo-fixtures
- [x] 4.1 writer
`,
    {
      milestones: [milestone("M0", [4, 5], "2026-11-07T18:00:00+01:00")],
      now: new Date("2026-11-07T12:00:00+01:00"),
    },
  );
  const missing = view.groups.find((group) => group.number === 5);

  expect(missing?.status).toBe("Not started");
  expect(missing?.title).toBe("Missing from tasks.md");
  expect(missing?.wave).toBeNull();
  expect(view.milestones[0]?.status).toBe("On track");
});
