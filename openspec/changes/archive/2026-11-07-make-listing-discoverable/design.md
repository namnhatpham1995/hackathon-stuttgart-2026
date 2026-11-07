# Design

## Context

- `product.listed` (boolean, not null, default `false`) already exists. `setProductListed` in
  `src/lib/connections/service.ts` changes it only where `product.user_id` is the caller, and
  returns 404 otherwise. `setListedAction` in `src/app/connections/actions.ts` checks the session,
  validates with Zod and calls it. Buyers read only `listed = true` rows that are not their own
  (`src/lib/buyer/service.ts`, `listDirectory`).
- The only UI for it is `ListingToggle` in `src/components/connections/product-connections.tsx`,
  mounted inside the collapsed `<details>` "Product details" in
  `src/components/workspace/product-workspace.tsx`.
- `WorkspaceProduct` (`src/components/workspace/contract.ts`) carries no `listed` field, so neither
  the product page header nor the product list (`workspace-home.tsx`) can show visibility today.
- `product-workspace.tsx` also renders a hardcoded "Requested by Neckar Maschinenbau GmbH" line.

## Goals / Non-Goals

**Goals:**
- Visibility is visible and changeable in one click from the product page, and visible in the list.
- One control for visibility, so the two places can never disagree.

**Non-Goals:**
- Changing the default, the column or what a listing shows to buyers.
- A modal or an extra step in the create form.
- Showing the real requesting buyer in the header. The "Buyer connections" section already lists
  real connections; this change only removes the fake line.

## Decisions

1. **Carry `listed` on `WorkspaceProduct`.** `loadWorkspaceProduct` (`src/lib/products/workspace.ts`)
   reads it from the owned product row; `createProduct` in `src/app/workspace/actions.ts` returns
   `listed: false`; fixtures set it explicitly. The product list and page then render from the data
   they already load, with no extra request. Alternative: fetch it with `loadProductConnections`
   on the client. Rejected: the list would need one request per product, and the header would
   flash an unknown state.
2. **A `ListingStatus` client component in `src/components/workspace/`**, rendered right after the
   page header and before the upload card. Unlisted: a callout ("Buyers can't see this product
   yet" + what listing shows + "List for buyers"). Listed: a one-line status with "Remove from
   directory". It posts to the existing `setListedAction` through `useActionState` and, on success,
   flips the local `listed` value through the workspace's existing `update()` so the page changes
   at once and survives a reload because the database changed. Alternative: a new route handler.
   Rejected: the server action already checks the session, validates and scopes by owner.
3. **Remove `ListingToggle` from `product-connections.tsx`.** Keeping both means two sources of
   truth on the same page. `ListedForm` on the connection page (`/connections/[connectionId]`)
   stays: it is a different page with its own reload.
4. **`setListedAction` also calls `revalidatePath("/workspace", "layout")`**, so the product list
   is not served stale from the router cache after a toggle.
5. **The product list shows a small "Listed" / "Not listed" label** in the product cell (both the
   mobile list and the desktop table), with text, not only colour.

No table, column or constraint is added; no new page, route handler or server action. The pages
touched (`/workspace`, `/workspace/[productId]`) and `setListedAction` already require a session.

## Risks / Trade-offs

- [The callout pushes the upload card down on a new product] → Keep it to one short paragraph and
  one button; once listed it collapses to a single line.
- [A supplier lists by accident] → The callout states what becomes visible, and removal is one
  click on the same spot.
- [Fixtures and tests that build `WorkspaceProduct` by hand break on the new required field] →
  Make `listed` required and fix every construction site the typecheck reports, so no product is
  silently treated as listed.

## Migration Plan

None. No schema change. Rollback is reverting the PR.
