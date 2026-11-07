# Proposal

## Why

A supplier created a product and a buyer friend could not find it. Products start unlisted, which is
the right default because nothing should be shown to buyers without the supplier's choice. But the
product page never says the product is hidden, and the only "List in the supplier directory" button
is inside the "Product details" panel, which starts collapsed. Suppliers think their product is
visible when it is not.

## What Changes

- The product workspace shows whether buyers can see the product, above the fold and outside the
  collapsed panel. While the product is unlisted, a callout explains that buyers cannot find it,
  says exactly what listing shows (name, part number, declared supplier profile; never documents or
  reports) and has one "List for buyers" button. Once the product is listed, a compact "Listed for
  buyers" status shows with a "Remove from directory" action.
- A newly created product lands on its workspace with that callout, so the supplier is offered
  listing right after creating it. There is no extra modal or step in the create form.
- The supplier's product list shows "Listed" or "Not listed" for each product.
- The listing toggle inside the collapsed "Product details" panel is removed, so there is one place
  to change visibility.
- The hardcoded "Requested by Neckar Maschinenbau GmbH" line on every product page is removed. It
  suggests a buyer is already involved when none may be. Real buyer connections stay listed under
  "Buyer connections".
- Listing stays opt-in. The `product.listed` column keeps its `false` default; what buyers see of a
  listed product does not change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `buyer-supplier-connections`: adds a requirement that a supplier can always see and change whether
  buyers can find a product from the product's own page and the product list. The listing
  requirement itself is still in the unarchived `exportready-hackathon-build` change and the main
  specs are empty, so this delta adds a new requirement rather than modifying that one.

## Impact

- `src/components/workspace/contract.ts` (`WorkspaceProduct` gains `listed`),
  `src/lib/products/workspace.ts` and `src/app/workspace/actions.ts` (fill it),
  `src/components/workspace/fixtures.ts`.
- `src/components/workspace/product-workspace.tsx` (new visibility callout, hardcoded requester line
  removed), `src/components/workspace/workspace-home.tsx` (list column),
  `src/components/connections/product-connections.tsx` (toggle removed).
- `src/app/connections/actions.ts`: `setListedAction` also revalidates `/workspace`.
- No schema change, no migration, no new environment variable, no new route.
