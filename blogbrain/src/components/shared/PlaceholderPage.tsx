import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type PlaceholderPageProps = {
  title: string
  description: string
  phase: string
}

export function PlaceholderPage({ title, description, phase }: PlaceholderPageProps) {
  return (
    <Card className="border-dashed shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description} ({phase})
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
