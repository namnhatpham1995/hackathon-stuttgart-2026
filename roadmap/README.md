# ExportReady live roadmap

A read-only page for the hackathon build. It shows milestones, waves and task groups from
`openspec/changes/exportready-hackathon-build/tasks.md`. Ticking a task and pushing is the update.
Nobody edits a separate progress file.

The page polls `GET /api/progress` every 30 seconds. The function caches for 20 seconds
(`Cache-Control: s-maxage=20, stale-while-revalidate=60`). With `GITHUB_TOKEN` set, one GitHub
GraphQL query reads `tasks.md` on `main` and on each open pull request. Without a token, the
function reads `main` from `raw.githubusercontent.com` and says that open pull requests are not
shown. That CDN can lag by about five minutes.

## Heading convention

Each group is one `##` heading. The parser ignores any other heading.

```text
## <n>. <title> · wave <w> · <milestone id> · branch <type>/<slug>
```

Example:

```text
## 2. Live roadmap page · wave 1 · M0 · branch feat/live-roadmap
```

The separators are the `·` character, not a hyphen. The milestone id is `M0` through `M5`. The
branch is the pull request branch for that group, used exactly.

Tasks are hyphen checkboxes. `[x]`, `[X]` and `[ x]` count as ticked. An indented line
`  - Blocked: <reason>` marks the group Blocked and the page shows the reason. A task whose text
contains `(post-merge)` stays open after the pull request merges; the group then shows as
"Merged, verifying" until that task is ticked on `main`.

## Tick + push = update

1. Tick the task in `tasks.md` (`- [ ]` to `- [x]`) in the same commit as the work.
2. Push the group's branch. The open pull request's head is what the roadmap reads, including
   draft pull requests.
3. After the pull request merges, the next refresh reads the tick from `main`.

A stuck task gets an indented `  - Blocked: <reason>` line, pushed at once. Remove that line when
the task is unblocked.

## Change a milestone time

Edit `target` in `roadmap/milestones.json`. Times are ISO-8601 with a `+01:00` offset
(Europe/Berlin on 7 November 2026). Keep each group number 1–17 in exactly one milestone.

Push the change to `main`. Vercel rebuilds because the file is under `roadmap/`. Tick counts do
not need a rebuild; milestone times do, because they are bundled into the function.

A milestone is Done when every one of its groups is Done, Late when the current time is after
`target` and it is not Done, and otherwise On track.

## Vercel project

Create a second Vercel project from this repository. Leave the app project as it is.

| Setting | Value |
|---|---|
| Root Directory | `roadmap` |
| Framework Preset | Other |
| Ignored Build Step | `git diff --quiet HEAD^ HEAD ./` |

`roadmap/vercel.json` sets the framework and the same ignored-build command. The root directory
still has to be chosen in the project settings, because this repository also contains the app.

The ignored-build command exits 0 when `roadmap/` did not change, and Vercel skips the build.
Progress ticks do not need a build.

The production URL is the project URL. `/` is this page and `/api/progress` is the JSON.

## GitHub token

Create a fine-grained personal access token and set it on this Vercel project only, as
`GITHUB_TOKEN`. Do not mark it `NEXT_PUBLIC`, and do not put it on the app project.

- Repository access: only `namnhatpham1995/hackathon-stuttgart-2026`.
- Permissions: Contents **Read**, Pull requests **Read**. No other permissions.
- The token must still be valid on submission day.

The function sends the token only in the `Authorization` header of its server-side GitHub
request. The JSON response and this page never include it. Without the variable, the page still
shows progress from `main`.
