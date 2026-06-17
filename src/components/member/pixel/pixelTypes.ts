export const ARTBOARD_SIZE = 1024

export type PixelGrid = {
  gridSize: number
  palette: string[]
  /** each row: digit indices into palette (0 = transparent) */
  pixels: string[]
}

export type PixelRect = {
  x: number
  y: number
  width: number
  height: number
  fill: string
}

export type SceneSlotKey = 'north' | 'west' | 'east' | 'south'

export type VillageSceneSlot = {
  slot_key: string
  sprite_key: string
  is_built: boolean
  is_unlocked: boolean
  level: number
}

export const SLOT_SCENE_KEYS: Record<string, SceneSlotKey> = {
  north: 'north',
  west: 'west',
  east: 'east',
  south: 'south',
}

/** 1024 캔버스 상 슬롯 히트 영역 */
export const SLOT_HIT_AREAS: Record<
  SceneSlotKey,
  { x: number; y: number; w: number; h: number }
> = {
  north: { x: 368, y: 72, w: 288, h: 280 },
  west: { x: 72, y: 368, w: 280, h: 288 },
  east: { x: 672, y: 368, w: 280, h: 288 },
  south: { x: 368, y: 672, w: 288, h: 280 },
}

export const SLOT_DRAW_ANCHORS: Record<
  SceneSlotKey,
  { cx: number; cy: number; size: number }
> = {
  north: { cx: 512, cy: 200, size: 200 },
  west: { cx: 200, cy: 512, size: 200 },
  east: { cx: 824, cy: 512, size: 200 },
  south: { cx: 512, cy: 824, size: 200 },
}

export const TREE_ANCHOR = { cx: 512, cy: 450, size: 280 }
