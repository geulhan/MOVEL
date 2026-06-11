/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface DocumentPictureInPicture {
  readonly window: Window | null
  requestWindow(options?: {
    width?: number
    height?: number
    disallowReturnToOpener?: boolean
  }): Promise<Window>
  addEventListener(
    type: 'enter',
    listener: (event: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void
  removeEventListener(
    type: 'enter',
    listener: (event: Event) => void,
    options?: boolean | EventListenerOptions,
  ): void
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture
}
