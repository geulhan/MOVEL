import { PageHelpButton } from './PageHelpButton'

type Props = {
  title: string
  description?: string
  helpText?: string
}

export function PageHeader({ title, description, helpText }: Props) {
  return (
    <header className="min-w-0">
      <div className="flex items-center gap-2">
        <h2 className="page-title">{title}</h2>
        {helpText && <PageHelpButton text={helpText} />}
      </div>
      {description && <p className="page-desc">{description}</p>}
    </header>
  )
}
