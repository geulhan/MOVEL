import { useState } from 'react'
import { CenterPassManager } from './CenterPassManager'
import { CenterPassProductEditor } from './CenterPassProductEditor'

type SubTab = 'products' | 'members'

export function CenterPassAdminPanel() {
  const [subTab, setSubTab] = useState<SubTab>('products')

  return (
    <div className="space-y-4">
      <nav className="chip-scroll -mx-1 px-1">
        <button
          type="button"
          onClick={() => setSubTab('products')}
          className={`chip ${subTab === 'products' ? 'chip-active' : 'chip-inactive'}`}
        >
          상품 · 가격
        </button>
        <button
          type="button"
          onClick={() => setSubTab('members')}
          className={`chip ${subTab === 'members' ? 'chip-active' : 'chip-inactive'}`}
        >
          회원 이용권
        </button>
      </nav>

      {subTab === 'products' ? <CenterPassProductEditor /> : <CenterPassManager />}
    </div>
  )
}
