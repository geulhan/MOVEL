import { useEffect, useState } from 'react'
import { TREE_WORLD } from './data/worldLayout'
import { TRACK_GYM_WALK_PATH } from './data/worldEnvironment'

type FloatingItem = {
  id: number
  x: number
  y: number
  text: string
  color: string
}

type Props = {
  active: boolean
  growthAmount?: number
  acornAmount?: number
}

let nextId = 0

export function VillageFloatingRewards({
  active,
  growthAmount = 12,
  acornAmount = 2,
}: Props) {
  const [items, setItems] = useState<FloatingItem[]>([])

  useEffect(() => {
    if (!active) {
      setItems([])
      return
    }

    const spawn = () => {
      const spotRoll = Math.random()
      let x: number
      let y: number
      if (spotRoll < 0.35) {
        x = TREE_WORLD.cx + (Math.random() - 0.5) * 80
        y = TREE_WORLD.cy - 40 + (Math.random() - 0.5) * 40
      } else if (spotRoll < 0.65) {
        const pt = TRACK_GYM_WALK_PATH[Math.floor(Math.random() * TRACK_GYM_WALK_PATH.length)]
        x = pt[0] + (Math.random() - 0.5) * 30
        y = pt[1] + (Math.random() - 0.5) * 20
      } else {
        x = 400 + Math.random() * 240
        y = 420 + Math.random() * 200
      }

      const isGrowth = Math.random() > 0.4
      const id = nextId++
      const text = isGrowth ? `+${growthAmount} 성장치` : `+🌰${acornAmount}`
      const color = isGrowth ? '#2d6a3e' : '#b8860b'

      setItems((prev) => [...prev.slice(-6), { id, x, y, text, color }])
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id))
      }, 2200)
    }

    spawn()
    const timer = setInterval(spawn, 1400)
    return () => clearInterval(timer)
  }, [active, growthAmount, acornAmount])

  if (items.length === 0) return null

  return (
    <g id="floating-rewards" pointerEvents="none">
      {items.map((item) => (
        <g key={item.id}>
          <text
            x={item.x}
            y={item.y}
            textAnchor="middle"
            fill={item.color}
            fontSize={14}
            fontWeight="bold"
            fontFamily="system-ui,sans-serif"
            stroke="#fff"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {item.text}
            <animate
              attributeName="y"
              from={item.y}
              to={item.y - 48}
              dur="2.2s"
              fill="freeze"
            />
            <animate
              attributeName="opacity"
              from={1}
              to={0}
              dur="2.2s"
              fill="freeze"
            />
          </text>
        </g>
      ))}
    </g>
  )
}
