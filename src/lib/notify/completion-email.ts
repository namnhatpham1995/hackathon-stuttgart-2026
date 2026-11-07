import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { assessmentJob, assessmentResult, notification, user } from "@/db/schema";
import { env } from "@/env";

import { sendBrevoEmail } from "./brevo";

const NOT_CONFIGURED = "email not configured";

const ISSUE_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
] as const;

/** Findings that are not DOCUMENTED. The baseline demo (R2, R3, R4) is three. */
export function documentationIssueCount(findings: readonly { status: string }[]): number {
  return findings.filter((finding) => finding.status !== "DOCUMENTED").length;
}

function issuePhrase(count: number): string {
  const amount = ISSUE_WORDS[count] ?? String(count);
  return count === 1
    ? `${amount} documentation issue remains`
    : `${amount} documentation issues remain`;
}

/** Fixed completion template. Text only: the report link is in the body, never an attachment. */
export function renderCompletionEmail(input: {
  productId: string;
  issueCount: number;
  appBaseUrl: string;
}): { subject: string; text: string } {
  const base = input.appBaseUrl.trim().replace(/\/+$/, "");
  const link = `${base}/workspace/${encodeURIComponent(input.productId)}/report`;
  return {
    subject: "Your TradeReady assessment is ready",
    text: [
      `Your document review is complete and ${issuePhrase(input.issueCount)}.`,
      "Open your report to see the supporting evidence and next steps.",
      "",
      link,
    ].join("\n"),
  };
}

async function markFailed(notificationId: string, error: string): Promise<void> {
  await db
    .update(notification)
    .set({ status: "failed", error: error.slice(0, 500) })
    .where(and(eq(notification.id, notificationId), eq(notification.status, "pending")));
}

/**
 * Claims a pending completion notice, sends it, and stores the provider message id or the error.
 * The status check only allows pending, sent and failed, so the claim is an update-where on
 * attempts rather than a "sending" status. A second call finds nothing to claim and does not send.
 * A missing key marks the row failed and leaves the stored report alone.
 */
export async function sendCompletionEmail(notificationId: string): Promise<void> {
  const claimed = await db
    .update(notification)
    .set({ attempts: 1 })
    .where(
      and(
        eq(notification.id, notificationId),
        eq(notification.status, "pending"),
        eq(notification.attempts, 0),
      ),
    )
    .returning({ id: notification.id });

  if (claimed.length === 0) {
    const [existing] = await db
      .select({ id: notification.id })
      .from(notification)
      .where(eq(notification.id, notificationId));
    if (!existing) throw new Error(`Notification ${notificationId} was not found`);
    return;
  }

  const appBaseUrl = env.APP_BASE_URL;
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL || !appBaseUrl) {
    await markFailed(notificationId, NOT_CONFIGURED);
    return;
  }

  try {
    const [row] = await db
      .select({
        type: notification.type,
        recipientEmail: notification.recipientEmail,
        accountEmail: user.email,
        productId: assessmentResult.productId,
        findings: assessmentResult.findings,
      })
      .from(notification)
      .innerJoin(user, eq(user.id, notification.recipientUserId))
      .innerJoin(assessmentJob, eq(assessmentJob.id, notification.jobId))
      .innerJoin(assessmentResult, eq(assessmentResult.jobId, assessmentJob.id))
      .where(eq(notification.id, notificationId));

    if (row?.type !== "assessment_completed") {
      await markFailed(notificationId, "completion email requires a stored assessment");
      return;
    }
    if (row.accountEmail !== row.recipientEmail) {
      await markFailed(notificationId, "recipient is not the account address");
      return;
    }

    const message = renderCompletionEmail({
      productId: row.productId,
      issueCount: documentationIssueCount(row.findings),
      appBaseUrl,
    });
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "email send failed";
    await markFailed(notificationId, message);
  }
}
