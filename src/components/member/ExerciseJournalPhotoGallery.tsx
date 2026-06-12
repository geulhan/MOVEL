type Props = {
  urls: string[]
  className?: string
}

export function ExerciseJournalPhotoGallery({ urls, className = '' }: Props) {
  if (urls.length === 0) return null

  return (
    <div className={`mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 ${className}`}>
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border border-gold/25 bg-cream/40"
        >
          <img
            src={url}
            alt="운동일지 사진"
            className="aspect-square w-full object-cover"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  )
}
