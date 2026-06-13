import { useEffect, useState } from 'react'
import {
  fetchRewardEarnRules,
  saveRewardEarnRules,
} from '../../api/rewards'
import {
  DEFAULT_REWARD_RULES,
  type RewardEarnRules,
  REWARD_EVENT_LABELS,
  STREAK_DAYS,
  type RewardEventType,
} from '../../constants/rewards'
import { CustomRewardRulesSection } from './CustomRewardRulesSection'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'

type RuleKey = Exclude<keyof RewardEarnRules, 'referral_percent' | 'custom_rules'>

const RULE_ROWS: {
  key: RuleKey
  description: string
}[] = [
  {
    key: 'pt_attendance',
    description: 'PT 수업 출석 시',
  },
  {
    key: 'steps_7000',
    description: '걸음 인증 7,000보 이상 (하루 1회)',
  },
  {
    key: 'steps_10000',
    description: '걸음 인증 10,000보 이상 (하루 1회, 구간별 중복 적립)',
  },
  {
    key: 'steps_15000',
    description: '걸음 인증 15,000보 이상 (하루 1회, 구간별 중복 적립)',
  },
  {
    key: 'exercise_journal',
    description: '운동일지 작성 시',
  },
  {
    key: 'streak_7day',
    description: `${STREAK_DAYS}일 연속 활동 달성 시`,
  },
  {
    key: 'center_photo',
    description: '센터 사진 인증 · 관리자 승인 후',
  },
  {
    key: 'naver_review',
    description: '네이버 리뷰 작성 · 센터 확인 후',
  },
]

function ruleLabel(key: RuleKey): string {
  return REWARD_EVENT_LABELS[key as RewardEventType]
}

export function RewardRulesEditor() {
  const [rules, setRules] = useState<RewardEarnRules>(DEFAULT_REWARD_RULES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        setRules(await fetchRewardEarnRules())
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '적립 규칙을 불러올 수 없습니다.',
        )
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function updateRule(
    key: RuleKey,
    field: 'score' | 'mile',
    value: string,
  ) {
    const parsed = Number(value.replace(/,/g, ''))
    setRules((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0,
      },
    }))
  }

  function updateReferralPercent(value: string) {
    const parsed = Number(value.replace(/,/g, ''))
    setRules((prev) => ({
      ...prev,
      referral_percent: Number.isFinite(parsed)
        ? Math.max(0, Math.round(parsed))
        : 0,
    }))
  }

  function resetToDefaults() {
    if (!window.confirm('기본 적립 포인트로 되돌릴까요? 저장하기 전까지는 반영되지 않습니다.')) {
      return
    }
    setRules(DEFAULT_REWARD_RULES)
    setMessage(null)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await saveRewardEarnRules({
        ...rules,
        custom_rules: rules.custom_rules.filter((rule) => rule.label.trim()),
      })
      setMessage('적립 포인트가 저장되었습니다. 이후 적립부터 새 규칙이 적용됩니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">불러오는 중…</p>
  }

  return (
    <div className="space-y-4">
      <div className={`${cardClass} overflow-hidden`}>
        <div className="card-header">
          <h3 className="text-base font-semibold text-charcoal">적립 포인트 설정</h3>
          <p className="mt-1 text-sm text-muted">
            활동별 MOVE SCORE · MOVE MILE 지급량을 설정합니다. 변경 사항은 저장
            이후 새로 발생하는 적립에만 적용됩니다.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-2.5 text-left">활동</th>
                <th className="px-3 py-2.5 text-right">SCORE</th>
                <th className="px-4 py-2.5 text-right">MILE</th>
              </tr>
            </thead>
            <tbody>
              {RULE_ROWS.map((row) => (
                <tr key={row.key} className="border-t border-gold/10">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-charcoal">
                      {ruleLabel(row.key)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{row.description}</p>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={rules[row.key].score}
                      onChange={(e) => updateRule(row.key, 'score', e.target.value)}
                      className={`${inputClass} w-24 text-right tabular-nums`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={rules[row.key].mile}
                      onChange={(e) => updateRule(row.key, 'mile', e.target.value)}
                      className={`${inputClass} w-28 text-right tabular-nums`}
                    />
                  </td>
                </tr>
              ))}
              <tr className="border-t border-gold/10 bg-cream/30">
                <td className="px-4 py-3">
                  <p className="font-semibold text-charcoal">지인 소개</p>
                  <p className="mt-0.5 text-xs text-muted">
                    소개 회원 결제 시 결제금액 대비 MILE 적립 비율 (소개자·신규
                    회원)
                  </p>
                </td>
                <td className="px-3 py-3 text-center text-xs text-muted">-</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={rules.referral_percent}
                      onChange={(e) => updateReferralPercent(e.target.value)}
                      className={`${inputClass} w-20 text-right tabular-nums`}
                    />
                    <span className="text-sm text-muted">%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gold/20 px-4 py-4 sm:px-6">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className={btnPrimary}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={resetToDefaults}
            className={btnOutline}
          >
            기본값으로 되돌리기
          </button>
        </div>
      </div>

      <CustomRewardRulesSection
        rules={rules.custom_rules}
        onChange={(custom_rules) => setRules((prev) => ({ ...prev, custom_rules }))}
        disabled={saving}
      />

      {message && (
        <div className="rounded-xl border border-gold/50 bg-white px-4 py-3 text-sm font-medium text-charcoal">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  )
}
