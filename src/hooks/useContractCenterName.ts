import { useEffect, useState } from 'react'
import {
  resolveContractDisplayCenterName,
  type ContractInstance,
} from '../api/contracts'

export function useContractCenterName(
  contract: Pick<ContractInstance, 'id' | 'center_id' | 'member_id' | 'field_data'> | null,
): string {
  const fallback = contract?.field_data?.centerName?.trim() || '센터'
  const [centerName, setCenterName] = useState(fallback)

  useEffect(() => {
    if (!contract) {
      setCenterName('센터')
      return
    }

    setCenterName(contract.field_data?.centerName?.trim() || '센터')

    let cancelled = false
    void resolveContractDisplayCenterName(contract).then((resolved) => {
      if (!cancelled) setCenterName(resolved)
    })

    return () => {
      cancelled = true
    }
  }, [contract?.id, contract?.center_id, contract?.member_id, contract?.field_data?.centerName])

  return centerName
}
