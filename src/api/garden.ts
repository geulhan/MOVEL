import type { GardenState } from '../types/garden'
import {
  fetchGardenStateRpc,
  moveGardenItemRpc,
  placeGardenItemRpc,
  purchaseGardenItemRpc,
  retrieveGardenItemRpc,
} from './garden/gardenRepository'

export type { GardenState }
export {
  fetchGardenStateRpc,
  purchaseGardenItemRpc,
  placeGardenItemRpc,
  moveGardenItemRpc,
  retrieveGardenItemRpc,
}

export async function getGardenState(memberId: string): Promise<GardenState> {
  return fetchGardenStateRpc(memberId)
}

export async function purchaseGardenItem(
  memberId: string,
  shopItemId: string,
): Promise<GardenState> {
  return purchaseGardenItemRpc(memberId, shopItemId)
}

export async function placeGardenItem(
  memberId: string,
  shopItemId: string,
  x: number,
  y: number,
): Promise<GardenState> {
  return placeGardenItemRpc(memberId, shopItemId, x, y)
}

export async function moveGardenItem(
  memberId: string,
  placementId: string,
  x: number,
  y: number,
): Promise<GardenState> {
  return moveGardenItemRpc(memberId, placementId, x, y)
}

export async function retrieveGardenItem(
  memberId: string,
  placementId: string,
): Promise<GardenState> {
  return retrieveGardenItemRpc(memberId, placementId)
}
