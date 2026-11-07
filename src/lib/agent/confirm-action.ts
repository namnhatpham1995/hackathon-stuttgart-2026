import { z } from "zod";

const text = z.string().trim().min(1).max(300);
const message = z.string().trim().max(1000).optional();

/** What the panel sends if the user presses Send. The server action validates it again. */
const sendSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request_evidence"),
    productId: text,
    buyerOrgName: text,
    message,
  }),
  z.object({
    action: z.literal("create_board_request"),
    buyerOrgName: text,
    title: text,
    partNumber: text,
    requirementSetKey: text,
    requirementSetVersion: z.number().int().positive(),
    message,
  }),
  z.object({
    action: z.literal("respond_to_request"),
    requestId: text,
    productId: text.optional(),
    newProductName: text.optional(),
    message,
  }),
  z.object({
    action: z.literal("share_result"),
    connectionId: text,
    resultId: text,
  }),
]);

/**
 * Browser-only directive. The server wrote nothing when it returned this: the
 * panel shows a card and calls the existing server action only on Send.
 */
export const confirmDirectiveSchema = z.object({
  type: z.literal("confirm_action"),
  title: z.string().max(200),
  details: z.array(z.string().max(500)).max(8),
  send: sendSchema,
});

export type ConfirmDirective = z.infer<typeof confirmDirectiveSchema>;
export type ConfirmSend = ConfirmDirective["send"];
