CREATE TABLE "ai_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_rate_limits" ADD CONSTRAINT "ai_rate_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_rate_limits_user_id_uidx" ON "ai_rate_limits" USING btree ("user_id");