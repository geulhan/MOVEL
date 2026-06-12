import { CenterPassManager } from './CenterPassManager'
import { CenterPassProductEditor } from './CenterPassProductEditor'

/** 센터 이용권: 상품 설정 + 회원 이용권을 한 화면에 */
export function CenterPassAdminPanel() {
  return (
    <div className="space-y-6">
      <CenterPassProductEditor />
      <CenterPassManager />
    </div>
  )
}
