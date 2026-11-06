---
name: feedback-no-wildcard-rm
description: "Never rm -rf with a wildcard or a relative path after cd: it asks for approval even in bypass mode and silently stalls an unattended worker"
metadata:
  type: feedback
---

A worker ran `cd /tmp/x && rm -rf * && unzip …` and sat on a permission prompt for three hours, although its session was in bypass-permissions mode. It looked "running" the whole time, so nobody noticed until the owner approved it by hand.

**Why:** recursive deletes with a wildcard, or on a relative path after `cd`, still trigger an approval prompt in bypass mode.

**How to apply:** create temp space with `mktemp -d` (or use the session scratchpad) and delete that exact absolute path. Put this rule in every worker brief. When a worker has been silent for more than 20 minutes, first check whether it is waiting on a prompt. Related: [[feedback-no-mutual-waiting]].
