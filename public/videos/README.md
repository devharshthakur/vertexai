# Demo lecture videos

Each demo course has a folder under `public/videos/`:

```text
public/videos/<slug>/
  about.md
  transcript.txt
  video.mp4
```

| Course                | Folder       |
| --------------------- | ------------ |
| Learning TypeScript   | `typescript` |
| Learning React        | `react`      |
| Learning Tailwind CSS | `tailwind`   |

`about.md` starts with the lecture title as a heading. `transcript.txt` is
required for seeding. `video.mp4` is optional; without it, the lecture has no
playable video.

## Download videos

Video files are not committed to the repository. Run:

```bash
pnpm demo:assets
```

The script downloads and verifies the demo archive. To download it manually:

```bash
curl -LO https://github.com/devharshthakur/vertexai/releases/download/demo-videos-v1/vertexai-demo-videos-v1.zip
curl -LO https://github.com/devharshthakur/vertexai/releases/download/demo-videos-v1/vertexai-demo-videos-v1.zip.sha256
shasum -a 256 -c vertexai-demo-videos-v1.zip.sha256
unzip vertexai-demo-videos-v1.zip
```

Use videos only when you have permission to use and redistribute them.
Everything under `public/videos/` is publicly served by the app.

## Seed the demo

Run `pnpm demo:setup` for a fresh demo database. It removes the Compose project's
containers and volumes before seeding; existing data in those volumes is lost.
For an existing migrated database, run `pnpm db:seed`.
