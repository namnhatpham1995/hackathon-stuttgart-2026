# Spec Delta

## Purpose

Gives the owner and every worker one always-current view of the hackathon build: which milestones,
waves and task groups are done, in progress, blocked or late, derived from the repository itself.

## ADDED Requirements

### Requirement: Progress comes from the task list on main
The roadmap SHALL compute each task group's progress from the change's `tasks.md` on the `main`
branch: the count of ticked and total tasks per `## N.` group heading. No separate progress file is
maintained by hand.

#### Scenario: Merged group shows done
- **WHEN** every task in group 4 is ticked in `tasks.md` on `main`
- **THEN** the roadmap shows group 4 as Done with its full task count

#### Scenario: Untouched group shows not started
- **WHEN** no task of a group is ticked on `main` and no open pull request uses that group's branch
- **THEN** the roadmap shows the group as Not started

### Requirement: Open pull requests show work in progress
The roadmap SHALL match each open pull request to a task group by the branch named in that group's
heading, and SHALL show that group's progress from the pull request head's `tasks.md`, together with
the pull request number, link, draft or ready state and the time of its latest commit.

#### Scenario: Draft PR with ticks
- **WHEN** an open draft pull request on branch `feat/rules-engine` has 2 of 4 tasks of its group ticked
- **THEN** the roadmap shows that group as In progress at 2/4 with a link to the pull request

#### Scenario: Ready PR
- **WHEN** the matching pull request is marked ready for review and all its group's tasks are ticked on its head
- **THEN** the roadmap shows the group as Ready to merge

### Requirement: Blocked groups are visible
The roadmap SHALL show a group as Blocked when any of its tasks, on the pull request head or on
`main`, carries an indented `Blocked:` note, and SHALL display the note text.

#### Scenario: Blocker on a branch
- **WHEN** task 9.3 on an open pull request has the line `  - Blocked: Brevo sender not verified`
- **THEN** the roadmap shows group 9 as Blocked with that reason

### Requirement: Milestones roll up groups against target times
The roadmap SHALL show each milestone with its target time (Europe/Berlin), its groups and a status:
Done when all its groups are Done, Late when its target time has passed and it is not Done, and
otherwise On track.

#### Scenario: Missed target
- **WHEN** the current time is after a milestone's target and one of its groups is still In progress
- **THEN** the roadmap marks that milestone Late

### Requirement: The page refreshes itself and shows freshness
The roadmap SHALL refresh its data at most every 30 seconds without a page reload and SHALL show when
the data was last fetched. When fetching fails it SHALL keep the last good data and show the error.

#### Scenario: GitHub unavailable
- **WHEN** a refresh fails because GitHub returns an error
- **THEN** the page keeps showing the previous data and shows a visible "data may be stale" message with the error

### Requirement: The roadmap is read-only and keeps credentials server-side
The roadmap SHALL expose no action that changes the repository, and any GitHub credential SHALL be
used only on the server and never sent to the browser. Without a credential it SHALL still show
progress from `main`.

#### Scenario: No token configured
- **WHEN** the roadmap runs without a GitHub token
- **THEN** it shows progress from `main` and states that open pull requests are not shown

#### Scenario: Token never reaches the client
- **WHEN** a visitor loads the page and its data endpoint
- **THEN** neither response contains the GitHub token
