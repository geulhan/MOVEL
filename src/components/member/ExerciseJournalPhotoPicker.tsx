import { useRef, useState, type ChangeEvent } from 'react'
import { btnOutline } from '../../styles/theme'

const MAX_PHOTOS = 5
const MAX_BYTES = 10 * 1024 * 1024

type Props = {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}

export function ExerciseJournalPhotoPicker({
  files,
  onChange,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  function revokePreviews(urls: string[]) {
    urls.forEach((url) => URL.revokeObjectURL(url))
  }

  function updateFiles(next: File[]) {
    revokePreviews(previewUrls)
    setPreviewUrls(next.map((file) => URL.createObjectURL(file)))
    onChange(next)
  }

  function handleSelect(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    e.target.value = ''

    const valid: File[] = []
    for (const file of selected) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_BYTES) continue
      valid.push(file)
    }

    const merged = [...files, ...valid].slice(0, MAX_PHOTOS)
    updateFiles(merged)
  }

  function removeAt(index: number) {
    updateFiles(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || files.length >= MAX_PHOTOS}
          onClick={() => inputRef.current?.click()}
          className={btnOutline}
        >
          사진 첨부 ({files.length}/{MAX_PHOTOS})
        </button>
        <span className="text-xs text-muted">JPEG·PNG·WEBP, 10MB 이하</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        className="hidden"
        onChange={handleSelect}
        disabled={disabled}
      />
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {previewUrls.map((url, index) => (
            <div key={url} className="relative">
              <img
                src={url}
                alt=""
                className="aspect-square w-full rounded-lg border border-gold/25 object-cover"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAt(index)}
                className="absolute top-1 right-1 rounded-full bg-charcoal/75 px-1.5 py-0.5 text-[10px] text-white"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
