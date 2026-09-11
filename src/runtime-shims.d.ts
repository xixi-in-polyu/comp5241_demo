declare const process: { cwd(): string }

declare module 'node:fs/promises' {
  export function readFile(path: string, encoding: string): Promise<string>
  export function readdir(path: string, options: { withFileTypes: true }): Promise<Array<{ name: string; isDirectory(): boolean }>>
}

declare module 'node:path' {
  const path: {
    join(...parts: string[]): string
    relative(from: string, to: string): string
    basename(value: string, suffix?: string): string
    extname(value: string): string
    posix: { join(...parts: string[]): string; normalize(value: string): string; dirname(value: string): string }
    sep: string
  }
  export default path
}

declare module 'sanitize-html' {
  const sanitizeHtml: {
    (html: string, options?: Record<string, unknown>): string
    defaults: { allowedTags: string[]; allowedAttributes: Record<string, string[]> }
  }
  export default sanitizeHtml
}
