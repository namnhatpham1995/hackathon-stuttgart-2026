CREATE TABLE "assessment_job" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"requirement_set_key" text NOT NULL,
	"requirement_set_version" integer NOT NULL,
	"document_set_hash" text NOT NULL,
	"document_ids" text[] NOT NULL,
	"status" text NOT NULL,
	"stage" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"result_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	CONSTRAINT "assessment_job_status" CHECK ("assessment_job"."status" in ('QUEUED', 'PROCESSING', 'COMPLETED', 'NEEDS_ATTENTION')),
	CONSTRAINT "assessment_job_stage" CHECK ("assessment_job"."stage" in ('extracting_text', 'extracting_facts', 'checking_rules', 'saving')),
	CONSTRAINT "assessment_job_completed_requires_result" CHECK ("assessment_job"."status" <> 'COMPLETED' or "assessment_job"."result_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "assessment_result" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"product_id" text NOT NULL,
	"assessment_date" date NOT NULL,
	"complete" boolean NOT NULL,
	"findings" jsonb NOT NULL,
	"documents" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_result_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "buyer_request" (
	"id" text PRIMARY KEY NOT NULL,
	"buyer_user_id" text NOT NULL,
	"buyer_org_name" text NOT NULL,
	"title" text NOT NULL,
	"part_number" text NOT NULL,
	"requirement_set_key" text NOT NULL,
	"requirement_set_version" integer NOT NULL,
	"message" text,
	"visibility" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_request_visibility" CHECK ("buyer_request"."visibility" in ('open', 'direct')),
	CONSTRAINT "buyer_request_status" CHECK ("buyer_request"."status" in ('open', 'closed')),
	CONSTRAINT "buyer_request_message_length" CHECK (char_length("buyer_request"."message") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"kind" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"content" "bytea" NOT NULL,
	"state" text NOT NULL,
	"replaces_document_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_mime_type" CHECK ("document"."mime_type" in ('application/pdf', 'image/jpeg', 'image/png')),
	CONSTRAINT "document_kind" CHECK ("document"."kind" in ('evidence', 'photo')),
	CONSTRAINT "document_evidence_is_pdf" CHECK ("document"."kind" <> 'evidence' or "document"."mime_type" = 'application/pdf'),
	CONSTRAINT "document_size_bytes" CHECK ("document"."size_bytes" > 0 and "document"."size_bytes" <= 4194304),
	CONSTRAINT "document_state" CHECK ("document"."state" in ('pending', 'active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text,
	"connection_id" text,
	"recipient_user_id" text NOT NULL,
	"recipient_email" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"read_at" timestamp with time zone,
	"status" text NOT NULL,
	"provider_message_id" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	CONSTRAINT "notification_type" CHECK ("notification"."type" in ('assessment_completed', 'request_received', 'report_shared')),
	CONSTRAINT "notification_status" CHECK ("notification"."status" in ('pending', 'sent', 'failed')),
	CONSTRAINT "notification_subject_matches_type" CHECK ((
        "notification"."type" = 'assessment_completed'
        and "notification"."job_id" is not null
        and "notification"."connection_id" is null
      ) or (
        "notification"."type" in ('request_received', 'report_shared')
        and "notification"."connection_id" is not null
        and "notification"."job_id" is null
      ))
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"requirement_set_key" text NOT NULL,
	"requirement_set_version" integer NOT NULL,
	"name" text NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"listed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"product_id" text NOT NULL,
	"initiated_by" text NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"shared_result_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "request_connection_initiated_by" CHECK ("request_connection"."initiated_by" in ('buyer', 'supplier')),
	CONSTRAINT "request_connection_status" CHECK ("request_connection"."status" in ('requested', 'in_progress', 'shared', 'declined')),
	CONSTRAINT "request_connection_message_length" CHECK (char_length("request_connection"."message") <= 1000),
	CONSTRAINT "request_connection_shared_requires_result" CHECK ("request_connection"."status" <> 'shared' or "request_connection"."shared_result_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "assessment_job" ADD CONSTRAINT "assessment_job_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_job" ADD CONSTRAINT "assessment_job_result_id_assessment_result_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."assessment_result"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_result" ADD CONSTRAINT "assessment_result_job_id_assessment_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."assessment_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_result" ADD CONSTRAINT "assessment_result_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_request" ADD CONSTRAINT "buyer_request_buyer_user_id_user_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_replaces_document_id_document_id_fk" FOREIGN KEY ("replaces_document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_job_id_assessment_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."assessment_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_connection_id_request_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."request_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_connection" ADD CONSTRAINT "request_connection_request_id_buyer_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."buyer_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_connection" ADD CONSTRAINT "request_connection_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_connection" ADD CONSTRAINT "request_connection_shared_result_id_assessment_result_id_fk" FOREIGN KEY ("shared_result_id") REFERENCES "public"."assessment_result"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_job_snapshot_unique" ON "assessment_job" USING btree ("product_id","requirement_set_key","requirement_set_version","document_set_hash");--> statement-breakpoint
CREATE INDEX "buyer_request_status_visibility_idx" ON "buyer_request" USING btree ("status","visibility");--> statement-breakpoint
CREATE INDEX "document_product_id_state_idx" ON "document" USING btree ("product_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_job_recipient_type_unique" ON "notification" USING btree ("job_id","recipient_email","type");--> statement-breakpoint
CREATE INDEX "notification_recipient_created_idx" ON "notification" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "product_user_id_idx" ON "product" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "request_connection_request_product_unique" ON "request_connection" USING btree ("request_id","product_id");