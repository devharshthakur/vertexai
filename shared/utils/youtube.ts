/** Returns the YouTube video ID for a supported HTTPS watch, short, embed, or shorts URL. */
export function getYouTubeVideoId(value: string): string | null {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    return null
  }

  if (url.protocol !== 'https:') return null

  let videoId: string | null = null

  if (url.hostname === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] ?? null
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v')
    } else {
      videoId = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? null
    }
  }

  return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null
}
