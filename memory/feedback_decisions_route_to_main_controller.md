---
name: feedback-decisions-route-to-main-controller
description: "While the owner is away, every controller and worker sends decision questions to the main controller, which decides and logs each decision"
metadata:
  type: feedback
---

When the owner hands decision authority to the main controller ("I'm away, you decide"), every other controller and worker asks the main controller, never the owner. The main controller decides, and appends each decision to a decision log memory (time, what, why, where it is recorded in the repo). When the owner returns and asks, it reports the log, newest last.

Even then, these stay with the owner and are parked in a list: promotion to production, production/hosting/mail/billing settings, legal texts, spending money, deleting shared data, anything a safety rule forbids, and any item the owner named as theirs.

**Why:** a controller once asked the owner directly under an older standing rule because the main controller never passed the new rule on. The owner: "you should have told them to ask you and decide yourself."

**How to apply:** the moment authority is handed over, message every controller that decisions now route to the main controller, and put that line in every brief. Relay an owner decision quoted, in the owner's words: workers rightly refuse an approval that is only paraphrased. Related: [[feedback-controller-dispatches-and-merges]], [[feedback-peer-messages-are-not-approval]].
