import { and, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db/client";
import { buyerRequest, notification, product, requestConnection, user } from "@/db/schema";
import { env } from "@/env";
import { sendBrevoEmail } from "@/lib/notify/brevo";

const NOT_CONFIGURED = "email not configured";
const CONNECTION_TYPES = ["request_received", "report_shared"] as const;

const buyerAccount = alias(user, "connection_buyer");
const supplierAccount = alias(user, "connection_supplier");

/**
 * Sends pending connection notices after the write that created them has committed.
 * A missing key or a Brevo error only marks the row failed. The connection stays.
 */
export async function deliverConnectionNotices(notificationIds: readonly string[]): Promise<void> {
  for (const id of notificationIds) {
    try {
      await deliverOne(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "email send failed";
      await markFailed(id, message);
    }
  }
}

async function markFailed(notificationId: string, error: string): Promise<void> {
  await db
    .update(notification)
    .set({ status: "failed", error: error.slice(0, 500) })
    .where(and(eq(notification.id, notificationId), eq(notification.status, "pending")));
}

async function deliverOne(notificationId: string): Promise<void> {
  const claimed = await db
    .update(notification)
    .set({ attempts: 1 })
    .where(
      and(
        eq(notification.id, notificationId),
        eq(notification.status, "pending"),
        eq(notification.attempts, 0),
        inArray(notification.type, [...CONNECTION_TYPES]),
      ),
    )
    .returning({ id: notification.id });
  if (claimed.length === 0) return;

  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) {
    await markFailed(notificationId, NOT_CONFIGURED);
    return;
  }

  const [row] = await db
    .select({
      title: notification.title,
      recipientEmail: notification.recipientEmail,
      accountEmail: user.email,
      connectionId: notification.connectionId,
      buyerEmail: buyerAccount.email,
      supplierEmail: supplierAccount.email,
    })
    .from(notification)
    .innerJoin(user, eq(user.id, notification.recipientUserId))
    .innerJoin(requestConnection, eq(requestConnection.id, notification.connectionId))
    .innerJoin(buyerRequest, eq(buyerRequest.id, requestConnection.requestId))
    .innerJoin(product, eq(product.id, requestConnection.productId))
    .innerJoin(buyerAccount, eq(buyerAccount.id, buyerRequest.buyerUserId))
    .innerJoin(supplierAccount, eq(supplierAccount.id, product.userId))
    .where(eq(notification.id, notificationId))
    .limit(1);

  if (!row?.connectionId) {
    await markFailed(notificationId, "connection notice is missing its connection");
    return;
  }
  if (row.accountEmail !== row.recipientEmail) {
    await markFailed(notificationId, "recipient is not the account address");
    return;
  }

  const message = renderConnectionEmail(row.title, row.connectionId);
  const hidden = [row.buyerEmail, row.supplierEmail].map((email) => email.toLowerCase());
  const body = `${message.subject}\n${message.text}`.toLowerCase();
  if (body.includes("@") || hidden.some((email) => email && body.includes(email))) {
    await markFailed(notificationId, "notice included an email address");
    return;
  }

  const { messageId } = await sendBrevoEmail({
    to: row.accountEmail,
    subject: message.subject,
    text: message.text,
  });

  await db
    .update(notification)
    .set({
      status: "sent",
      providerMessageId: messageId,
      sentAt: new Date(),
      error: null,
    })
    .where(and(eq(notification.id, notificationId), eq(notification.status, "pending")));
}

function renderConnectionEmail(
  title: string,
  connectionId: string,
): { subject: string; text: string } {
  const lines = [title];
  const base = env.APP_BASE_URL?.replace(/\/+$/, "");
  if (base) lines.push("", `${base}/connections/${encodeURIComponent(connectionId)}`);
  return { subject: title, text: lines.join("\n") };
}
