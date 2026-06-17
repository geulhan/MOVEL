import type { SlgVillageState } from '../types/slgVillage'
import {
  fetchSlgVillageStateRpc,
  moveSlgBuildingRpc,
  placeSlgBuildingRpc,
  purchaseSlgBuildingRpc,
  retrieveSlgBuildingRpc,
} from './slgVillage/slgVillageRepository'

export type { SlgVillageState }

export async function getSlgVillageState(memberId: string): Promise<SlgVillageState> {
  return fetchSlgVillageStateRpc(memberId)
}

export async function purchaseSlgBuilding(
  memberId: string,
  buildingId: string,
): Promise<SlgVillageState> {
  return purchaseSlgBuildingRpc(memberId, buildingId)
}

export async function placeSlgBuilding(
  memberId: string,
  buildingId: string,
  x: number,
  y: number,
): Promise<SlgVillageState> {
  return placeSlgBuildingRpc(memberId, buildingId, x, y)
}

export async function moveSlgBuilding(
  memberId: string,
  placementId: string,
  x: number,
  y: number,
): Promise<SlgVillageState> {
  return moveSlgBuildingRpc(memberId, placementId, x, y)
}

export async function retrieveSlgBuilding(
  memberId: string,
  placementId: string,
): Promise<SlgVillageState> {
  return retrieveSlgBuildingRpc(memberId, placementId)
}
