import type { FunctionDeclaration, Schema } from "@google/genai";
import { Type } from "@google/genai";
import { z } from "zod";

import { getRequirementSet } from "@/lib/assessment/requirement-sets";
import {
  closeMyRequest,
  getCatalogProduct,
  listMyRequests,
  searchCatalog,
} from "@/lib/buyer/service";
import {
  createBuyerRequestInput,
  type ConnectionRole,
  getProductConnections,
  listCompletedResults,
  listInbox,
  listOpenBoard,
  requestEvidenceInput,
  requireConnection,
  respondToRequestInput,
} from "@/lib/connections/service";
import { getProduct } from "@/lib/products/service";
import { type ConfirmDirective, confirmDirectiveSchema } from "./confirm-action";

/**
 * Buyer and connection tools. The read tools and close_request run at once and
 * only touch the signed-in user's own rows. The four confirm tools validate,
 * look up the names the card shows and return a confirm directive: they write
 * nothing and send nothing. The panel calls the existing server action on Send.
 */

export type ConnectionToolResult = {
  output: Record<string, unknown>;
  directive?: ConfirmDirective;
};

export const connectionToolNames = [
  "search_catalog",
  "list_my_requests",
  "list_board",
  "read_inbox",
  "close_request",
  "list_product_connections",
  "request_evidence",
  "create_board_request",
  "respond_to_request",
  "share_result",
] as const;
export type ConnectionToolName = (typeof connectionToolNames)[number];

type Handler = (
  userId: string,
  contextProductId: string | null,
  args: unknown,
  workspace: ConnectionRole | null,
) => Promise<ConnectionToolResult>;

const LIST_LIMIT = 20;
const idSchema = z.string().trim().min(1).max(200);
const optionalMessage = z.string().trim().max(1000).optional();

const catalogArgs = z.object({
  q: z.string().trim().max(100).optional(),
  productCategory: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
});
const closeArgs = z.object({ requestId: idSchema });
const productArgs = z.object({ productId: idSchema.optional() });
const evidenceArgs = z.object({
  productId: idSchema.optional(),
  buyerOrgName: z.string().trim().min(1).max(300),
  message: optionalMessage,
});
const respondArgs = z.object({
  requestId: idSchema,
  productId: idSchema.optional(),
  newProductName: z.string().trim().min(1).max(300).optional(),
  message: optionalMessage,
});
const shareArgs = z.object({ connectionId: idSchema, resultId: idSchema.optional() });

function failed(error: string, recovery: string): ConnectionToolResult {
  return { output: { ok: false, error, recovery } };
}

/** Same sentence for every foreign id, so a miss does not reveal whose row it is. */
export function connectionNotFound(): ConnectionToolResult {
  return {
    output: {
      ok: false,
      error: "not found",
      recovery: "Check the id with the matching list tool and ask again.",
      message: "I could not open it. It was not found.",
    },
  };
}

function invalid(error: z.ZodError): ConnectionToolResult {
  return failed("Invalid arguments", error.issues[0]?.message ?? "Check the values and try again.");
}

function confirmCard(
  title: string,
  details: string[],
  send: ConfirmDirective["send"],
): ConnectionToolResult {
  const parsed = confirmDirectiveSchema.safeParse({ type: "confirm_action", title, details, send });
  if (!parsed.success)
    return failed("The card could not be prepared.", "Use the form on the page.");
  return {
    output: {
      ok: true,
      status: "WAITING_FOR_USER",
      message: "A confirm card is shown. Nothing has been sent until the user presses Send.",
    },
    directive: parsed.data,
  };
}

const handlers: Record<ConnectionToolName, Handler> = {
  async search_catalog(userId, _product, args) {
    const parsed = catalogArgs.safeParse(args ?? {});
    if (!parsed.success) return invalid(parsed.error);
    const rows = await searchCatalog(userId, parsed.data);
    return {
      output: {
        ok: true,
        products: rows.slice(0, LIST_LIMIT).map((row) => ({
          productId: row.productId,
          name: row.productName,
          partNumber: row.partNumber,
          company: row.profile?.companyName ?? null,
          myConnection: row.myConnection,
        })),
      },
    };
  },

  async list_my_requests(userId) {
    const rows = await listMyRequests(userId);
    return {
      output: {
        ok: true,
        requests: rows.slice(0, LIST_LIMIT).map((row) => ({
          requestId: row.requestId,
          title: row.title,
          partNumber: row.partNumber,
          status: row.status,
          connections: row.connections.map((connection) => ({
            connectionId: connection.connectionId,
            productName: connection.productName,
            supplierCompany: connection.supplierCompany,
            status: connection.status,
          })),
        })),
      },
    };
  },

  async list_board(userId) {
    const rows = await listOpenBoard(userId);
    return {
      output: {
        ok: true,
        requests: rows
          .filter((row) => !row.own)
          .slice(0, LIST_LIMIT)
          .map((row) => ({
            requestId: row.id,
            buyerOrgName: row.buyerOrgName,
            title: row.title,
            partNumber: row.partNumber,
            requirementSetKey: row.requirementSetKey,
          })),
      },
    };
  },

  async read_inbox(userId, _product, _args, workspace) {
    if (!workspace)
      return failed(
        "Choose a workspace first.",
        "Open Buyer or Supplier, then ask to read its inbox.",
      );
    const rows = await listInbox(userId, workspace);
    return {
      output: {
        ok: true,
        notices: rows.slice(0, LIST_LIMIT).map((row) => ({
          type: row.type,
          title: row.title,
          unread: row.readAt === null,
          createdAt: row.createdAt,
        })),
      },
    };
  },

  async close_request(userId, _product, args) {
    const parsed = closeArgs.safeParse(args ?? {});
    if (!parsed.success) return invalid(parsed.error);
    const closed = await closeMyRequest(userId, parsed.data.requestId);
    if (!closed) return connectionNotFound();
    return { output: { ok: true, closed: true, message: "The request was closed." } };
  },

  async list_product_connections(userId, contextProductId, args) {
    const parsed = productArgs.safeParse(args ?? {});
    if (!parsed.success) return invalid(parsed.error);
    const productId = parsed.data.productId ?? contextProductId;
    if (!productId) return failed("No product is open.", "Open a product first.");
    const owned = await getProduct(userId, productId);
    if (!owned) return connectionNotFound();
    const view = await getProductConnections(userId, owned.id);
    return {
      output: {
        ok: true,
        productName: view.productName,
        listed: view.listed,
        connections: view.connections,
      },
    };
  },

  async request_evidence(userId, contextProductId, args) {
    const parsed = evidenceArgs.safeParse(args ?? {});
    if (!parsed.success) return invalid(parsed.error);
    const input = requestEvidenceInput.safeParse({
      ...parsed.data,
      productId: parsed.data.productId ?? contextProductId ?? "",
    });
    if (!input.success) return invalid(input.error);
    const listing = await getCatalogProduct(userId, input.data.productId);
    if (!listing) return connectionNotFound();
    return confirmCard(
      "Request evidence",
      [
        `Product: ${listing.productName}${listing.partNumber ? ` (${listing.partNumber})` : ""}`,
        `Your organisation: ${input.data.buyerOrgName}`,
        "The supplier is notified by email.",
        ...(input.data.message ? [`Note: ${input.data.message}`] : []),
      ],
      { action: "request_evidence", ...input.data },
    );
  },

  async create_board_request(_userId, _product, args) {
    const input = createBuyerRequestInput.safeParse(args ?? {});
    if (!input.success) return invalid(input.error);
    if (!getRequirementSet(input.data.requirementSetKey, input.data.requirementSetVersion)) {
      return failed(
        "That checklist does not exist.",
        "Use a checklist key and version the site offers.",
      );
    }
    return confirmCard(
      "Post a request to the board",
      [
        `Title: ${input.data.title}`,
        `Part number: ${input.data.partNumber}`,
        `Organisation: ${input.data.buyerOrgName}`,
        `Checklist: ${input.data.requirementSetKey} v${input.data.requirementSetVersion}`,
        "Suppliers on the site can see it.",
        ...(input.data.message ? [`Note: ${input.data.message}`] : []),
      ],
      { action: "create_board_request", ...input.data },
    );
  },

  async respond_to_request(userId, _product, args) {
    const parsed = respondArgs.safeParse(args ?? {});
    if (!parsed.success) return invalid(parsed.error);
    const input = respondToRequestInput.safeParse(parsed.data);
    if (!input.success) return invalid(input.error);
    const board = await listOpenBoard(userId);
    const request = board.find((row) => row.id === input.data.requestId && !row.own);
    if (!request) return connectionNotFound();
    let productLine = `New product: ${input.data.newProductName}`;
    if (input.data.productId) {
      const owned = await getProduct(userId, input.data.productId);
      if (!owned) return connectionNotFound();
      productLine = `Product: ${owned.name}`;
    }
    return confirmCard(
      "Respond to a request",
      [
        `Request: ${request.title} (${request.partNumber})`,
        `Buyer: ${request.buyerOrgName}`,
        productLine,
        "The buyer is notified by email.",
        ...(input.data.message ? [`Note: ${input.data.message}`] : []),
      ],
      { action: "respond_to_request", ...input.data },
    );
  },

  async share_result(userId, _product, args) {
    const parsed = shareArgs.safeParse(args ?? {});
    if (!parsed.success) return invalid(parsed.error);
    const view = await requireConnection(userId, parsed.data.connectionId);
    if (view.role !== "supplier") return connectionNotFound();
    const results = await listCompletedResults(userId, parsed.data.connectionId);
    const result = parsed.data.resultId
      ? results.find((row) => row.id === parsed.data.resultId)
      : results[0];
    if (!result) {
      return parsed.data.resultId
        ? connectionNotFound()
        : failed("There is no completed assessment to share.", "Complete an assessment first.");
    }
    return confirmCard(
      "Share an assessment result",
      [
        `Product: ${view.productName}`,
        `Result of ${result.assessmentDate}`,
        `Buyer: ${view.buyerOrgName}, request "${view.requestTitle}"`,
        "The buyer sees this one result and is notified by email.",
      ],
      { action: "share_result", connectionId: parsed.data.connectionId, resultId: result.id },
    );
  },
};

export function runConnectionTool(
  name: ConnectionToolName,
  userId: string,
  contextProductId: string | null,
  args: unknown,
  workspace: ConnectionRole | null = null,
): Promise<ConnectionToolResult> {
  return handlers[name](userId, contextProductId, args, workspace);
}

const productIdProperty: Schema = {
  type: Type.STRING,
  description: "Product id. Omit it to use the product open in the workspace.",
};

function declaration(
  name: ConnectionToolName,
  description: string,
  properties: Record<string, Schema> = {},
  required: string[] = [],
): FunctionDeclaration {
  return {
    name,
    description,
    parameters: {
      type: Type.OBJECT,
      description: name,
      properties,
      ...(required.length > 0 ? { required } : {}),
    },
  };
}

const str = (description: string): Schema => ({ type: Type.STRING, description });

export const connectionDeclarations: FunctionDeclaration[] = [
  declaration(
    "search_catalog",
    "Search the products other suppliers have listed (never your own, never unlisted ones). Filters are optional. Changes nothing.",
    {
      q: str("Text in the name, part number or company."),
      productCategory: str("Declared product category."),
      country: str("Declared country."),
    },
  ),
  declaration(
    "list_my_requests",
    "List the buyer requests this user posted, with their connections. Changes nothing.",
  ),
  declaration(
    "list_board",
    "List open buyer requests of other companies, so a supplier can respond. Changes nothing.",
  ),
  declaration("read_inbox", "Read this user's connection notices. Changes nothing."),
  declaration(
    "close_request",
    "Close one of this user's own open buyer requests. Nothing is emailed. A request that is not theirs is not found.",
    { requestId: str("Request id from list_my_requests.") },
    ["requestId"],
  ),
  declaration(
    "list_product_connections",
    "List the connections of a product this user owns, to find a connection id for share_result. Changes nothing.",
    { productId: productIdProperty },
  ),
  declaration(
    "request_evidence",
    "Prepare an evidence request for a listed product. Writes and emails nothing: the user sees a card and must press Send.",
    {
      productId: str("Catalog product id from search_catalog."),
      buyerOrgName: str("The buyer's organisation name."),
      message: str("Optional note to the supplier."),
    },
    ["productId", "buyerOrgName"],
  ),
  declaration(
    "create_board_request",
    "Prepare a request for the open board. Writes nothing: the user sees a card and must press Send.",
    {
      buyerOrgName: str("The buyer's organisation name."),
      title: str("Short title."),
      partNumber: str("Part number wanted."),
      requirementSetKey: str("Checklist key, for example neckar-cap-104."),
      requirementSetVersion: { type: Type.INTEGER, description: "Checklist version." },
      message: str("Optional note."),
    },
    ["buyerOrgName", "title", "partNumber", "requirementSetKey", "requirementSetVersion"],
  ),
  declaration(
    "respond_to_request",
    "Prepare a supplier's response to an open board request, with an existing product or a new product name. Writes nothing: the user sees a card and must press Send.",
    {
      requestId: str("Request id from list_board."),
      productId: str("One of this user's products."),
      newProductName: str("Instead of productId: a new product name."),
      message: str("Optional note."),
    },
    ["requestId"],
  ),
  declaration(
    "share_result",
    "Prepare sharing a completed assessment result with the buyer of a connection. Writes and emails nothing: the user sees a card and must press Send.",
    {
      connectionId: str("Connection id from list_product_connections."),
      resultId: str("Completed result id. Omit it for the latest."),
    },
    ["connectionId"],
  ),
];
