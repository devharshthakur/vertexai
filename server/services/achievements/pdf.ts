import { Buffer } from 'node:buffer'
import { useStorage } from 'nitropack/runtime'
import pdfmake from 'pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'

/**
 * Certificate PDF rendering.
 *
 * The layout is a declarative pdfmake document definition rather than manual
 * coordinates. Roboto is embedded because PDF's standard fonts only cover ANSI
 * text; both weights are bundled as Nitro server assets (see
 * `server/assets/certificate-fonts/README.md`), so they travel with the build
 * instead of being read from `node_modules` at runtime.
 *
 * Fonts are configured once per process. `setFonts` replaces the dictionary, so
 * a dev-server reload cannot register the same family twice.
 */

const FONT_MOUNT = 'assets:server'
const FONT_PREFIX = 'certificate-fonts/'

let pdfmakeConfiguration: Promise<void> | undefined

function configurePdfmake(): Promise<void> {
  pdfmakeConfiguration ??= (async () => {
    // The document is text and embedded fonts only, so pdfmake never needs to
    // fetch a URL or read a local file. Denying both also silences its startup
    // reminder about unset access policies.
    pdfmake.setUrlAccessPolicy(() => false)
    pdfmake.setLocalAccessPolicy(() => false)

    const storage = useStorage(FONT_MOUNT)
    const [regular, bold] = await Promise.all([storage.getItemRaw(`${FONT_PREFIX}Roboto-Regular.ttf`), storage.getItemRaw(`${FONT_PREFIX}Roboto-Medium.ttf`)])

    if (!(regular instanceof Uint8Array) || !(bold instanceof Uint8Array)) {
      throw new Error('[certificates] The bundled Roboto fonts are missing.')
    }

    pdfmake.setFonts({ Roboto: { normal: Buffer.from(regular), bold: Buffer.from(bold) } })
  })()

  return pdfmakeConfiguration
}

/** A filename safe to send in `Content-Disposition`, derived from the course title. */
export function certificateFileName(courseTitle: string): string {
  const slug = courseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return `certificate-${slug || 'course'}.pdf`
}

interface CertificateDetails {
  recipientName: string
  courseTitle: string
  certificateId: string
  issuedAt: Date
}

/** Renders the one-page landscape certificate as PDF bytes. */
export async function renderCertificatePdf({ recipientName, courseTitle, certificateId, issuedAt }: CertificateDetails): Promise<Buffer> {
  await configurePdfmake()

  const issued = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(issuedAt)
  const definition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: 56,
    defaultStyle: { font: 'Roboto', color: '#18181b' },
    content: [
      { text: 'CERTIFICATE OF COMPLETION', alignment: 'center', fontSize: 11, color: '#71717a', margin: [0, 70, 0, 0] },
      { text: 'This certifies that', alignment: 'center', fontSize: 13, color: '#52525b', margin: [0, 48, 0, 8] },
      { text: recipientName, alignment: 'center', fontSize: 30, bold: true, margin: [0, 0, 0, 26] },
      { text: 'has completed the course', alignment: 'center', fontSize: 13, color: '#52525b', margin: [0, 0, 0, 8] },
      { text: courseTitle, alignment: 'center', fontSize: 22, bold: true, margin: [0, 0, 0, 40] },
      { text: `Issued ${issued}`, alignment: 'center', fontSize: 11, color: '#52525b' },
      { text: `Certificate ID ${certificateId}`, alignment: 'center', fontSize: 8, color: '#a1a1aa', margin: [0, 4, 0, 0] },
      { text: 'VertexAI', alignment: 'center', fontSize: 12, bold: true, color: '#71717a', margin: [0, 54, 0, 0] }
    ]
  }

  return pdfmake.createPdf(definition).getBuffer()
}
