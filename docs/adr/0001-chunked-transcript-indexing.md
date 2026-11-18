# ADR 0001 — Index lecture transcripts in passages, not as one vector per lecture

- **Status:** Accepted
- **Date:** 2026-11-16
- **Area:** AI tutor, retrieval

## Context

The tutor grounds its answers in the lecture transcripts of a course. Until now, each
lecture was embedded as a single vector: `lectures.embedding vector(1536)` held one
vector for the whole transcript, and the cosine query compared a question against those
whole transcripts.

That design has a hard ceiling. The embedding model, `openai/text-embedding-3-large`,
accepts at most 8,192 input tokens and rejects anything longer with
`Invalid 'input[0]': maximum input length is 8192 tokens`. A transcript is not bounded
by that limit, so the seeded Tailwind CSS lecture (50,547 characters, about 11,700
tokens) could not be embedded at all. Because the indexing run covered every lecture of
a course inside one error boundary, that single rejection turned into `503 The AI tutor
could not prepare this course.` for the whole course, and the student saw only a generic
"the AI service may be unavailable" message.

The TypeScript lecture sits at 7,711 tokens, 94 % of the model window, so the failure
was one transcript edit away.

The same assumption shaped the prompt: the whole transcript of every retrieved lecture
was injected into the model context, so the grounded prompt grew with the lecture
instead of with the answer.

## Decision

A transcript is split into passages, and each passage is embedded on its own.

- `lecture_chunks` stores one row per passage: `lecture_id`, `course_id`, `position`,
  `content`, and a `vector(1536)` embedding with an HNSW cosine index.
- `server/services/ai/chunking.ts` cuts a transcript into chunks of
  `AI_EMBEDDING_CHUNK_TOKENS` tokens (default 1,500), keeping paragraphs whole when
  they fit, splitting a long paragraph at sentence boundaries, and overlapping
  consecutive chunks so a question that spans a boundary still finds its context.
- `AI_EMBEDDING_MAX_INPUT_TOKENS` (default 8,192) records the model's input window.
  The chunk budget must stay below it, and the configuration refuses to start otherwise.
- Retrieval is one cosine query over the course's chunk vectors. The passages closest
  to the question become the grounded context, which also bounds the prompt.
- Indexing isolates failures per lecture: one transcript that the provider rejects no
  longer takes the course's tutor down. A course whose transcripts all fail reports a
  clear "could not index the lecture material" error instead of a generic one.
- A transcript edit drops that lecture's passages and its cached summary, so the next
  use indexes the new text.

## Consequences

- A transcript of any length can be indexed with the configured model, and the tutor
  works for every seeded course.
- The grounded context is smaller and more focused: six passages instead of three whole
  transcripts.
- Indexing costs one embedding request per passage instead of one per lecture. The
  seeded Tailwind lecture becomes about nine requests instead of one, which is a fraction
  of a cent.
- Vectors from different embedding models are still not comparable, so changing
  `AI_EMBEDDING_MODEL` means clearing `lecture_chunks` before the course is indexed
  again.
- The `lectures.embedding` and `lectures.embedded_at` columns are gone; the passages
  replace them.

## Alternatives considered

- **Switch the embedding model.** `cohere/embed-v4.0` accepts the whole Tailwind
  transcript and also returns 1,536 dimensions, so it is a one-line change. It was
  rejected as the structural fix because it depends on one provider's window instead of
  the app's own limits, and because a provider may silently truncate a long input.
- **Truncate the transcript before embedding.** Cheap, but retrieval quality then
  depends on where the cut falls, and the rest of the lecture becomes unreachable.
- **Map-reduce summarisation.** Embeds a summary of the transcript instead of the
  transcript, which loses the detail a question may need.
