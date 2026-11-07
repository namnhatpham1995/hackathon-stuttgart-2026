// ExportReady tables. The rules in design.md Decision 2 are PostgreSQL constraints.
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type {
  AssessedDocument,
  Finding,
  ProductFields,
  StoredSupplierProfile,
} from "@/lib/assessment/types";

import { user } from "./auth";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const timestamps = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const product = pgTable(
  "product",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requirementSetKey: text().notNull(),
    requirementSetVersion: integer().notNull(),
    name: text().notNull(),
    fields: jsonb().$type<ProductFields>().notNull().default(sql`'{}'::jsonb`),
    profile: jsonb().$type<StoredSupplierProfile>().notNull().default(sql`'{}'::jsonb`),
    listed: boolean().notNull().default(false),
    ...timestamps,
  },
  (table) => [index("product_user_id_idx").on(table.userId)],
);

export const document = pgTable(
  "document",
  {
    id: text().primaryKey(),
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    filename: text().notNull(),
    mimeType: text().notNull(),
    kind: text().notNull(),
    sizeBytes: integer().notNull(),
    sha256: text().notNull(),
    content: bytea().notNull(),
    state: text().notNull(),
    replacesDocumentId: text().references((): AnyPgColumn => document.id),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    index("document_product_id_state_idx").on(table.productId, table.state),
    check(
      "document_mime_type",
      sql`${table.mimeType} in ('application/pdf', 'image/jpeg', 'image/png')`,
    ),
    check("document_kind", sql`${table.kind} in ('evidence', 'photo')`),
    check(
      "document_evidence_is_pdf",
      sql`${table.kind} <> 'evidence' or ${table.mimeType} = 'application/pdf'`,
    ),
    check("document_size_bytes", sql`${table.sizeBytes} > 0 and ${table.sizeBytes} <= 4194304`),
    check("document_state", sql`${table.state} in ('pending', 'active', 'inactive')`),
  ],
);

export const assessmentJob = pgTable(
  "assessment_job",
  {
    id: text().primaryKey(),
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    requirementSetKey: text().notNull(),
    requirementSetVersion: integer().notNull(),
    documentSetHash: text().notNull(),
    documentIds: text().array().notNull(),
    status: text().notNull(),
    stage: text(),
    error: text(),
    attempts: integer().notNull().default(0),
    resultId: text().references((): AnyPgColumn => assessmentResult.id),
    createdAt: timestamp().defaultNow().notNull(),
    startedAt: timestamp(),
    finishedAt: timestamp(),
  },
  (table) => [
    uniqueIndex("assessment_job_snapshot_unique").on(
      table.productId,
      table.requirementSetKey,
      table.requirementSetVersion,
      table.documentSetHash,
    ),
    check(
      "assessment_job_status",
      sql`${table.status} in ('QUEUED', 'PROCESSING', 'COMPLETED', 'NEEDS_ATTENTION')`,
    ),
    check(
      "assessment_job_stage",
      sql`${table.stage} in ('extracting_text', 'extracting_facts', 'checking_rules', 'saving')`,
    ),
    check(
      "assessment_job_completed_requires_result",
      sql`${table.status} <> 'COMPLETED' or ${table.resultId} is not null`,
    ),
  ],
);

export const assessmentResult = pgTable("assessment_result", {
  id: text().primaryKey(),
  jobId: text()
    .notNull()
    .unique("assessment_result_job_id_unique")
    .references(() => assessmentJob.id, { onDelete: "cascade" }),
  productId: text()
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  assessmentDate: date({ mode: "string" }).notNull(),
  complete: boolean().notNull(),
  findings: jsonb().$type<Finding[]>().notNull(),
  documents: jsonb().$type<AssessedDocument[]>().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const buyerRequest = pgTable(
  "buyer_request",
  {
    id: text().primaryKey(),
    buyerUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    buyerOrgName: text().notNull(),
    title: text().notNull(),
    partNumber: text().notNull(),
    requirementSetKey: text().notNull(),
    requirementSetVersion: integer().notNull(),
    message: text(),
    visibility: text().notNull(),
    status: text().notNull().default("open"),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    index("buyer_request_status_visibility_idx").on(table.status, table.visibility),
    check("buyer_request_visibility", sql`${table.visibility} in ('open', 'direct')`),
    check("buyer_request_status", sql`${table.status} in ('open', 'closed')`),
    check("buyer_request_message_length", sql`char_length(${table.message}) <= 1000`),
  ],
);

export const requestConnection = pgTable(
  "request_connection",
  {
    id: text().primaryKey(),
    requestId: text()
      .notNull()
      .references(() => buyerRequest.id, { onDelete: "cascade" }),
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    initiatedBy: text().notNull(),
    status: text().notNull(),
    message: text(),
    sharedResultId: text().references(() => assessmentResult.id),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("request_connection_request_product_unique").on(table.requestId, table.productId),
    check("request_connection_initiated_by", sql`${table.initiatedBy} in ('buyer', 'supplier')`),
    check(
      "request_connection_status",
      sql`${table.status} in ('requested', 'in_progress', 'shared', 'declined')`,
    ),
    check("request_connection_message_length", sql`char_length(${table.message}) <= 1000`),
    check(
      "request_connection_shared_requires_result",
      sql`${table.status} <> 'shared' or ${table.sharedResultId} is not null`,
    ),
  ],
);

export const notification = pgTable(
  "notification",
  {
    id: text().primaryKey(),
    jobId: text().references(() => assessmentJob.id, { onDelete: "cascade" }),
    connectionId: text().references(() => requestConnection.id, { onDelete: "cascade" }),
    recipientUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipientEmail: text().notNull(),
    type: text().notNull(),
    title: text().notNull(),
    readAt: timestamp({ withTimezone: true }),
    status: text().notNull(),
    providerMessageId: text(),
    error: text(),
    attempts: integer().notNull().default(0),
    createdAt: timestamp().defaultNow().notNull(),
    sentAt: timestamp(),
  },
  (table) => [
    uniqueIndex("notification_job_recipient_type_unique").on(
      table.jobId,
      table.recipientEmail,
      table.type,
    ),
    index("notification_recipient_created_idx").on(table.recipientUserId, table.createdAt),
    check(
      "notification_type",
      sql`${table.type} in ('assessment_completed', 'request_received', 'report_shared')`,
    ),
    check("notification_status", sql`${table.status} in ('pending', 'sent', 'failed')`),
    check(
      "notification_subject_matches_type",
      sql`(
        ${table.type} = 'assessment_completed'
        and ${table.jobId} is not null
        and ${table.connectionId} is null
      ) or (
        ${table.type} in ('request_received', 'report_shared')
        and ${table.connectionId} is not null
        and ${table.jobId} is null
      )`,
    ),
  ],
);
