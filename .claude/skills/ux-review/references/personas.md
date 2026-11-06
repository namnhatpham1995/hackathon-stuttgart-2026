# Personas and journeys

This file is a template. The personas, the seeded data and the journeys below fit a generic signed-in web
app, which is what the starter is. Replace them with your product's own personas and journeys as soon as the
product has them, and keep them true: an audit walks only what this file names, and `serve` creates only the
accounts and data this file asks for.

Every run uses synthetic people only. The accounts come from `target.json` in the run folder (`personas`:
role, address, note) and from the throwaway users you register yourself. All signed-in personas use the
password in `<run folder>/password` (safety.md): read it from the file, type it into the sign-in form, and
never echo it in output, a report or a command line. The password is for one run on a database that is
dropped afterwards.

The pages named below are routes of `src/app/` with route groups such as `(auth)` left out:
`src/app/(auth)/sign-in/page.tsx` is `/sign-in`, `src/app/dashboard/page.tsx` is `/dashboard`. The list of
every page comes from `node scripts/ux-review/routes.mjs` when the project has it, or from a Glob of
`src/app/**/page.tsx`, never from this file: use it to find a page, and use this file for who walks it.

| Persona | Account | What is there |
|---|---|---|
| Visitor | none, signed out | the public pages, sign-in and sign-up |
| First-time user | registers itself with `ux-new-<label>-<random>@example.com` | nothing yet: an empty dashboard, every empty state |
| Returning user | the address `target.json` lists with role `returning` | enough data to fill every list and count the app has: one item, many items, a long name, a record in each state |
| Admin | the address `target.json` lists with role `admin` (a plain persona promoted in the throwaway database only) | the admin pages, once the app has roles; until then this persona is left out |

Replace with your product's personas: name each by what the person is trying to do, give the account and
say what data `serve` puts in place for it.

No journey of a non-admin runs as the admin, and the admin is not used to look at user pages.

## What the seed holds

Write here what `serve` creates for the personas, so the auditor knows what to expect and can tell a missing
row from a bug: each record, its state, its owner, and the slug or id a dynamic route needs. For the starter,
the returning user is `ux-returning@example.com` ("Rosa Returning") with only its account: the starter has
no data of its own yet. There is no admin persona, because the starter has no roles. Every feature that adds
a table adds its synthetic rows to `scripts/ux-review/seed-personas.ts` and a line here.

## Journeys

**Visitor.** The home page, every public page, sign-up and sign-in. A 404 page (`/<nonsense>`), a sign-in
with a wrong password and with an unknown address, a protected page such as `/dashboard` while signed out
(it should send you to sign-in and back after it). A third-party sign-in button, if one shows, is checked,
not clicked (safety.md).

**First-time user.** Sign up through the real form, land where the app sends a new user, and take the first
step of every main feature. This is where unclear next steps, dead ends and missing feedback show. Note every
moment where a real newcomer would not know what to do next.

**Returning user.** Sign in, sign out, the back button after sign-out, a page refresh on each page, every
list and its detail page, every form that changes data (with the reload check of the checklist), account
settings. Delete-account up to the confirmation only.

**Admin.** The admin pages, once the app has them. Read-heavy: open, filter, search, and look at empty and
long states. Cancel anything irreversible before it confirms.

## Matrix

Per persona: 1440 x 900, 768 x 1024 and 375 x 812, light and dark. One language, unless the app has more and
the brief names them. A scoped run walks the journeys that touch the routes in the brief, plus the sign-in
journey of the persona those routes need, not all personas.

## Mapping a pull request to routes

`gh pr diff <n> --name-only`, then: `src/app/<path>/page.tsx` is `/<path>`, with every route group folder
`(<name>)` removed. A changed component, style or layout file maps to the routes that import it, found by a
bounded search of `src/`: at most 5 routes for one run (the largest pilot run). Beyond that, stop and ask for
an explicit list, or split the routes into runs of at most 5. Dynamic segments (`[id]`, `[slug]`) need a real
value: take one from the list page that links to it.
