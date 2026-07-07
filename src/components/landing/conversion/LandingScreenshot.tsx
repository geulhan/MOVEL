type Props = {
  src: string
  alt: string
  caption?: string
  priority?: boolean
}

export function LandingScreenshot({ src, alt, caption, priority }: Props) {
  return (
    <figure className="landing-shot">
      <div className="landing-shot-frame">
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="landing-shot-img"
        />
      </div>
      {caption ? (
        <figcaption className="mt-4 text-center text-sm font-medium text-charcoal/60 sm:text-base">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
