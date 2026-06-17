import type { SlgVillageState } from '../types/slgVillage'
import {
  buildSlgVillageSlotRpc,
  fetchSlgVillageStateRpc,
  upgradeSlgVillageSlotRpc,
} from './slgVillage/slgVillageRepository'

export type { SlgVillageState }

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
