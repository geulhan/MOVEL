import type { WorldBuildingKey } from './worldLayout'

const base = '/assets/village'

/** 베타용 AI 임시 에셋 — 스타일 통일 우선 */
export const VILLAGE_TREE_ASSETS: Record<string, string> = {
  seed: `${base}/trees/seed.png`,
  sprout: `${base}/trees/sprout.png`,
  small: `${base}/trees/small.png`,
  large: `${base}/trees/large.png`,
  sakura: `${base}/trees/sakura.png`,
}

export const VILLAGE_BUILDING_EXTERIOR: Record<WorldBuildingKey, string> = {
  plaza: `${base}/buildings/plaza-exterior.png`,
  gym: `${base}/buildings/gym-exterior.png`,
  track: `${base}/buildings/track-exterior.png`,
  recovery: `${base}/buildings/recovery-exterior.png`,
  nutrition: `${base}/buildings/nutrition-exterior.png`,
  hall: `${base}/buildings/hall-exterior.png`,
}

export const VILLAGE_BUILDING_INTERIOR: Record<WorldBuildingKey, string> = {
  plaza: `${base}/interiors/plaza-interior.png`,
  gym: `${base}/interiors/gym-interior.png`,
  track: `${base}/interiors/track-interior.png`,
  recovery: `${base}/interiors/recovery-interior.png`,
  nutrition: `${base}/interiors/nutrition-interior.png`,
  hall: `${base}/interiors/hall-interior.png`,
}

export function resolveTreeAsset(stageKey: string): string {
  return VILLAGE_TREE_ASSETS[stageKey] ?? VILLAGE_TREE_ASSETS.seed
}
