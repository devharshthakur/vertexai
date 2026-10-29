CREATE TABLE "course_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"reviewed_by" text NOT NULL,
	"decision" varchar(20) NOT NULL,
	"comment" text,
	"reviewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_approvals" ADD CONSTRAINT "course_approvals_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_approvals" ADD CONSTRAINT "course_approvals_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_approvals_courseId_idx" ON "course_approvals" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_approvals_reviewedBy_idx" ON "course_approvals" USING btree ("reviewed_by");