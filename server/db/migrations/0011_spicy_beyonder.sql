CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "ai_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"course_id" uuid NOT NULL,
	"message" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lectures" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "lectures" ADD COLUMN "embedded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lectures" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "lectures" ADD COLUMN "summary_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_chat_messages_userId_courseId_createdAt_idx" ON "ai_chat_messages" USING btree ("user_id","course_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_chat_messages_courseId_idx" ON "ai_chat_messages" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "lectures_embedding_hnsw_idx" ON "lectures" USING hnsw ("embedding" vector_cosine_ops);