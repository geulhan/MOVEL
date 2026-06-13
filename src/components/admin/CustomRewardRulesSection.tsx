import {
  createEmptyCustomRewardRule,
  CUSTOM_REWARD_TRIGGER_LABELS,
  CUSTOM_REWARD_VALUE_TYPE_LABELS,
  type CustomRewardRule,
  type CustomRewardValueType,
} from '../../constants/rewards'
import {
  PAYMENT_CATEGORIES,
  PAYMENT_CATEGORY_LABELS,
  type PaymentCategory,
} from '../../constants/paymentCategories'
import { btnOutline, cardClass, inputClass } from '../../styles/theme'

type Props = {
  rules: CustomRewardRule[]
  onChange: (rules: CustomRewardRule[]) => void
  disabled?: boolean
}

export function CustomRewardRulesSection({ rules, onChange, disabled }: Props) {
  function updateRule(index: number, patch: Partial<CustomRewardRule>) {
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))
  }

  function removeRule(index: number) {
    onChange(rules.filter((_, i) => i !== index))
  }

  function addRule() {
    onChange([...rules, createEmptyCustomRewardRule()])
  }

  function toggleCategory(index: number, category: PaymentCategory) {
    const rule = rules[index]
    const current =
      rule.payment_categories === null
        ? [...PAYMENT_CATEGORIES]
        : [...rule.payment_categories]
    const next = current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]

    updateRule(index, {
      payment_categories:
        next.length === PAYMENT_CATEGORIES.length ? null : next,
    })
  }

  function isCategoryChecked(rule: CustomRewardRule, category: PaymentCategory) {
    if (rule.payment_categories === null) return true
    return rule.payment_categories.includes(category)
  }

  return (
    <div className={`${cardClass} overflow-hidden`}>
      <div className="card-header flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-charcoal">추가 적립 항목</h3>
          <p className="mt-1 text-sm text-muted">
            센터별 맞춤 규칙을 추가할 수 있습니다. 예: 결제 완료 시 결제금액의
            5% MILE 자동 적립. 비활성화하거나 항목을 비우면 적용되지 않습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={addRule}
          disabled={disabled}
          className={`shrink-0 ${btnOutline}`}
        >
          항목 추가
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted sm:px-6">
          추가된 맞춤 적립 항목이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-gold/15">
          {rules.map((rule, index) => (
            <li key={rule.id} className="space-y-4 px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-charcoal">
                  <input
                    type="checkbox"
                    checked={rule.is_active}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRule(index, { is_active: e.target.checked })
                    }
                    className="size-4 rounded border-gold/40"
                  />
                  사용
                </label>
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  disabled={disabled}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  삭제
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium text-charcoal/70">
                    항목 이름
                  </span>
                  <input
                    type="text"
                    value={rule.label}
                    disabled={disabled}
                    onChange={(e) => updateRule(index, { label: e.target.value })}
                    placeholder="예: 결제 적립"
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium text-charcoal/70">
                    회원 안내 설명 (선택)
                  </span>
                  <input
                    type="text"
                    value={rule.description}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRule(index, { description: e.target.value })
                    }
                    placeholder="예: PT·이용권 결제 시 자동 적립"
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">
                    적용 시점
                  </span>
                  <select
                    value={rule.trigger}
                    disabled={disabled}
                    onChange={() => undefined}
                    className={inputClass}
                  >
                    <option value="payment_completed">
                      {CUSTOM_REWARD_TRIGGER_LABELS.payment_completed}
                    </option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">
                    적립 방식
                  </span>
                  <select
                    value={rule.value_type}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRule(index, {
                        value_type: e.target.value as CustomRewardValueType,
                      })
                    }
                    className={inputClass}
                  >
                    {(
                      Object.entries(CUSTOM_REWARD_VALUE_TYPE_LABELS) as [
                        CustomRewardValueType,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">
                    SCORE
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={rule.score}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRule(index, {
                        score: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className={`${inputClass} tabular-nums`}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">
                    {rule.value_type === 'payment_percent' ? 'MILE (%)' : 'MILE'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={rule.value_type === 'payment_percent' ? 100 : undefined}
                    step={1}
                    value={rule.mile}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRule(index, {
                        mile: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className={`${inputClass} tabular-nums`}
                  />
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-charcoal/70">
                  적용 결제 구분
                </p>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_CATEGORIES.map((category) => (
                    <label
                      key={category}
                      className="inline-flex items-center gap-2 rounded-lg border border-gold/25 bg-white px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={isCategoryChecked(rule, category)}
                        disabled={disabled}
                        onChange={() => toggleCategory(index, category)}
                        className="size-4 rounded border-gold/40"
                      />
                      {PAYMENT_CATEGORY_LABELS[category]}
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  모두 선택 시 전체 결제에 적용됩니다.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-charcoal">
                <input
                  type="checkbox"
                  checked={rule.once_per_member}
                  disabled={disabled}
                  onChange={(e) =>
                    updateRule(index, { once_per_member: e.target.checked })
                  }
                  className="size-4 rounded border-gold/40"
                />
                회원당 1회만 적립
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
