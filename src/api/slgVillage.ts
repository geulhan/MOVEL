import type { SlgVillageState } from '../types/slgVillage'
import {
  buildSlgVillageSlotRpc,
  collectSlgVillageProductionRpc,
  fetchSlgVillageStateRpc,
  upgradeSlgVillageSlotRpc,
} from './slgVillage/slgVillageRepository'

export type { SlgVillageState }
export type { CollectVillageProductionResult } from './slgVillage/slgVillageRepository'

export async function getSlgVillageState(memberId: string): Promise<SlgVillageState> {
  return fetchSlgVillageStateRpc(memberId)
}

export async function buildSlgVillageSlot(
  memberId: string,
  slotKey: string,
): Promise<SlgVillageState> {
  return buildSlgVillageSlotRpc(memberId, slotKey)
}

export async function upgradeSlgVillageSlot(
  memberId: string,
  slotKey: string,
): Promise<SlgVillageState> {
  return upgradeSlgVillageSlotRpc(memberId, slotKey)
}

export async function collectSlgVillageProduction(memberId: string) {
  return collectSlgVillageProductionRpc(memberId)
}
