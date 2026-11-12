CREATE TABLE "assignment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"storage_key" uuid NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"content_type" varchar(120) NOT NULL,
	"size_bytes" integer NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"grade" numeric(5, 2),
	"feedback" text,
	"graded_at" timestamp with time zone,
	CONSTRAINT "assignment_submissions_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"instructions" text NOT NULL,
	"rubric" jsonb NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_submissions_assignmentId_userId_uidx" ON "assignment_submissions" USING btree ("assignment_id","user_id");--> statement-breakpoint
CREATE INDEX "assignment_submissions_assignmentId_idx" ON "assignment_submissions" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "assignment_submissions_userId_idx" ON "assignment_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assignments_courseId_dueAt_idx" ON "assignments" USING btree ("course_id","due_at");