CREATE TABLE "lecture_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lecture_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "lectures_embedding_hnsw_idx";--> statement-breakpoint
ALTER TABLE "lecture_chunks" ADD CONSTRAINT "lecture_chunks_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecture_chunks" ADD CONSTRAINT "lecture_chunks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lecture_chunks_courseId_idx" ON "lecture_chunks" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "lecture_chunks_lectureId_idx" ON "lecture_chunks" USING btree ("lecture_id");--> statement-breakpoint
CREATE INDEX "lecture_chunks_embedding_hnsw_idx" ON "lecture_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "lectures" DROP COLUMN "embedding";--> statement-breakpoint
ALTER TABLE "lectures" DROP COLUMN "embedded_at";