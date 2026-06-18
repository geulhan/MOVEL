type Props = {
  imageUrl: string
  cx: number
  groundY: number
  imgX: number
  imgY: number
  imgW: number
  imgH: number
  plotRx: number
  plotRy: number
  opacity?: number
}

/** 투명 PNG 건물 — 잔디 부지 위 + drop-shadow */
export function WorldBuildingExteriorGraphic({
  imageUrl,
  cx,
  groundY,
  imgX,
  imgY,
  imgW,
  imgH,
  plotRx,
  plotRy,
  opacity = 1,
}: Props) {
  const contactRx = plotRx * 0.68
  const contactRy = Math.max(plotRy * 0.2, 10)

  return (
    <g>
      <ellipse
        cx={cx}
        cy={groundY + 6}
        rx={contactRx + 10}
        ry={contactRy + 4}
        fill="#142810"
        opacity={0.22}
      />
      <ellipse
        cx={cx}
        cy={groundY + 3}
        rx={contactRx}
        ry={contactRy}
        fill="#0d1a0c"
        opacity={0.42}
      />
      <g filter="url(#wm-building-shadow)">
        <image
          href={imageUrl}
          x={imgX}
          y={imgY}
          width={imgW}
          height={imgH}
          opacity={opacity}
          preserveAspectRatio="xMidYMax meet"
        />
      </g>
    </g>
  )
}
