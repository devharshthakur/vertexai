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

## Obtaining the videos

Download the archive from the
[demo-videos-v1 release](https://github.com/devharshthakur/vertexai/releases/download/demo-videos-v1/vertexai-demo-videos-v1.zip)
(~630 MB). It contains one `video.mp4` per course under `public/videos/<slug>/`.

From the project root:

```bash
curl -LO https://github.com/devharshthakur/vertexai/releases/download/demo-videos-v1/vertexai-demo-videos-v1.zip
curl -LO https://github.com/devharshthakur/vertexai/releases/download/demo-videos-v1/vertexai-demo-videos-v1.zip.sha256
shasum -a 256 -c vertexai-demo-videos-v1.zip.sha256
unzip vertexai-demo-videos-v1.zip
rm vertexai-demo-videos-v1.zip vertexai-demo-videos-v1.zip.sha256
```

The archive extracts into `public/videos/<slug>/` and includes the committed
`about.md` and `transcript.txt` files, so it does not need to be merged with them.
Only download and redistribute these videos where you have permission to do so.

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
required by the demo seed and is the transcript stored on the seeded lecture.

## Seeding

Run `pnpm demo:setup` for a fresh demo database. It validates every folder first,
then deletes the Compose project's containers and volumes, creates a database,
applies migrations, and seeds it. All existing data in those volumes is lost.
For an existing migrated database, use `pnpm db:seed` instead. Missing or
malformed files stop either command with the affected path.
