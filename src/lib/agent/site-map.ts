import { z } from "zod";

/**
 * The site's pages the assistant may open. A closed list: the model never
 * supplies a URL, only one of these paths.
 */
export const siteRoutes = [
  "/dashboard",
  "/workspace",
  "/buyer",
  "/buyer/products",
  "/connections",
  "/connections/requests/new",
  "/connections/suppliers",
  "/connections/inbox",
] as const;

export type SiteRoute = (typeof siteRoutes)[number];

export const siteRouteSchema = z.enum(siteRoutes);

/** Browser-only directive: the panel pushes the route. Never a free URL. */
export const siteDirectiveSchema = z.object({
  type: z.literal("navigate_site"),
  route: siteRouteSchema,
});
export type SiteDirective = z.infer<typeof siteDirectiveSchema>;

export const siteRouteLabels: Record<SiteRoute, string> = {
  "/dashboard": "the workspace chooser",
  "/workspace": "the supplier's Products list (New product starts a two-step form there)",
  "/buyer": "the buyer's Overview (My requests is further down the page)",
  "/buyer/products": "the buyer's Find products page",
  "/connections": "the connections Board",
  "/connections/requests/new": "the New request page (Request evidence)",
  "/connections/suppliers": "the connections Directory",
  "/connections/inbox": "the connections Inbox",
};

/** One path pattern per real page. `:id` matches one segment. */
const pagePatterns: { pattern: RegExp; label: string }[] = [
  { pattern: /^\/dashboard$/, label: "the workspace chooser" },
  { pattern: /^\/workspace$/, label: "the supplier's Products list" },
  { pattern: /^\/workspace\/states$/, label: "the supplier's state gallery" },
  { pattern: /^\/workspace\/[^/]+$/, label: "a supplier product (draft and uploads)" },
  { pattern: /^\/workspace\/[^/]+\/report$/, label: "a supplier product's report" },
  { pattern: /^\/buyer$/, label: "the buyer's Overview" },
  { pattern: /^\/buyer\/products$/, label: "the buyer's Find products page" },
  { pattern: /^\/buyer\/products\/[^/]+$/, label: "a product in the buyer's catalog" },
  { pattern: /^\/connections$/, label: "the connections Board" },
  { pattern: /^\/connections\/requests$/, label: "the connections request list" },
  { pattern: /^\/connections\/requests\/new$/, label: "the New request page" },
  { pattern: /^\/connections\/suppliers$/, label: "the connections Directory" },
  { pattern: /^\/connections\/inbox$/, label: "the connections Inbox" },
  { pattern: /^\/connections\/[^/]+$/, label: "one connection" },
];

export const pagePathSchema = z
  .string()
  .max(300)
  .refine((path) => pagePatterns.some(({ pattern }) => pattern.test(path)), {
    message: "Unknown page",
  });

/** One sentence for the system instruction. */
export function describePage(path: string): string {
  const match = pagePatterns.find(({ pattern }) => pattern.test(path));
  return match ? `The user is on ${match.label}.` : "The user is on a page of the site.";
}

/** Fixed text. It lists pages, not data, so it holds nothing about any user. */
export const siteMapText = [
  "The site has one account that is both a supplier and a buyer.",
  "Supplier: Products (list, and New product, a two-step form), a product draft, uploads, and the report.",
  "Buyer: Overview, My requests, Find products, and Request evidence (New request).",
  "Connections: Board, New request, Directory, Inbox.",
  "/dashboard is the workspace chooser.",
].join(" ");
