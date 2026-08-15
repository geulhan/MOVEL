import { resolveTreeAsset } from './data/villageAssets'

type StageKey = 'seed' | 'sprout' | 'small' | 'large' | 'sakura' | string

type Props = {
  cx: number
  cy: number
  size: number
  stageKey: StageKey
}

/** PNG 도트 나무 에셋 — SVG 원형 나무보다 선명 */
export function WorldKingdomTreeGraphic({ cx, cy, size, stageKey }: Props) {
  const url = resolveTreeAsset(stageKey)
  const w = size
  const h = size * 1.12
  const x = cx - w / 2
  const y = cy - h * 0.78

  return (
    <g filter="url(#wm-tree-shadow)">
      <ellipse
        cx={cx}
        cy={cy + size * 0.1}
        rx={size * 0.22}
        ry={size * 0.06}
        fill="#142810"
        opacity={0.35}
      />
      <image
        href={url}
        x={x}
        y={y}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMax meet"
      />
    </g>
  )
}
