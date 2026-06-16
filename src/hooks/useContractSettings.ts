import { useCallback, useEffect, useState } from 'react'
import {
  fetchContractSettings,
  saveContractSettings,
} from '../api/contractSettings'
import {
  DEFAULT_CONTRACT_SETTINGS,
  type ContractSettings,
} from '../types/contractSettings'

export function useContractSettings() {
  const [settings, setSettings] = useState<ContractSettings>({
    ...DEFAULT_CONTRACT_SETTINGS,
  })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const next = await fetchContractSettings()
      setSettings(next)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(async (next: ContractSettings) => {
    const saved = await saveContractSettings(next)
    setSettings(saved)
    return saved
  }, [])

  return { settings, loading, reload, save }
}
