Analyze the following blog article and return a JSON object matching the schema.

Extract:
1. title_pattern — recurring title structure/formula
2. intro_pattern — how the article opens
3. emotion_words — emotionally charged words used
4. entities — people, organizations, places mentioned
5. brands — brand names mentioned
6. keywords — topical keywords
7. category — primary content category
8. cta — call-to-action phrases if any
9. writing_style — tone and style description
10. paragraph_length — average sentence/paragraph characteristics
11. seo_keywords — SEO-relevant keywords
12. confidence — overall confidence score (0-1)
13. new_patterns — newly discovered words or expressions unique to this blog

Article Title:
{{title}}

Article Body:
{{body}}

Source URL (optional):
{{source_url}}

Memo (optional):
{{memo}}
