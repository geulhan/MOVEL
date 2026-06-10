type Props = {
  title: string
  description?: string
}

export function PageHeader({ title, description }: Props) {
  return (
    <header className="min-w-0">
      <h2 className="page-title">{title}</h2>
      {description && <p className="page-desc">{description}</p>}
    </header>
  )
}
