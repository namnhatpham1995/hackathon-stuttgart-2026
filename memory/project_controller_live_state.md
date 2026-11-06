---
name: project-controller-live-state
description: "TEMPLATE — the main controller's handoff note: READ FIRST after a clear. Newest entry on top; replace this template on first use"
metadata:
  type: project
---

Template. The main controller rewrites this file before every clear and after every merge or dispatch. Keep it short: older entries move down and are pruned once they no longer matter.

## <date> <time>Z — <one-line headline>
- Role: this session is the MAIN controller ("<name>"). Owner's standing orders: <quote>. Owner-only items: <list>.
- Machines and order: <M1 → M2 → M3>; controller names `[Mx] Controller`.
- Running: <machine/worker> → <change/group or fix>, branch <branch>, PR <n>, state <planning|coding|hook|review rN|PASS at sha>.
- Waiting on owner: <item, what is needed>.
- Next dispatch: <item> → first idle worker in order; then <item>.
- Open migrations: <one at most, which PR>.
- Merged today: <PR → main sha>.

Related: [[feedback-controller-context-hygiene]], [[feedback-decisions-route-to-main-controller]].
