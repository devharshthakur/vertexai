# Demo lecture videos

Each demo course reads its lecture from its own folder:

```text
public/videos/<slug>/
  video.mp4
  transcript.txt
  about.md
```

| Course                | Slug         | Source video                                |
| --------------------- | ------------ | ------------------------------------------- |
| Learning TypeScript   | `typescript` | https://www.youtube.com/watch?v=BCg4U1FzODs |
| Learning React        | `react`      | https://www.youtube.com/watch?v=hQAHSlTtcmY |
| Learning Tailwind CSS | `tailwind`   | https://www.youtube.com/watch?v=6biMWgD6_JY |

The links identify the intended source videos. Download them only if you have
permission to use and redistribute the content.

The folders are committed; video files are ignored by Git and must be added
locally before running `pnpm db:seed`. Everything in `public/videos/` is
publicly served by Nuxt, so use demo material you are allowed to distribute.

## Video file

Each folder must contain one MP4 video. The seed uses `video.mp4` when present
and otherwise the first `.mp4` file in the folder. Use MP4 with H.264 video and
AAC audio so it plays in every modern browser. Other video formats are ignored.

## `about.md`

The first heading is the lecture title. The remaining text is used as the
plain-text course description.

```markdown
# Introduction to TypeScript

A short description of the course and what students will learn.
```

## `transcript.txt`

Plain-text transcript of the lecture. It is stored on the seeded lecture and is
required by the demo seed.

## Seeding

The seed validates every folder before changing database rows. Missing or
malformed files stop the seed with the affected path.
