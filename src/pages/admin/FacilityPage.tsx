import { CenterPassManager } from '../../components/admin/CenterPassManager'
import { PageHeader } from '../../components/admin/PageHeader'

export default function FacilityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="센터 이용권"
        description="PT와 별개인 센터 기간권 상품·회원 부여를 관리합니다. (추후 판매·배포용)"
      />
      <CenterPassManager />
    </div>
  )
}
