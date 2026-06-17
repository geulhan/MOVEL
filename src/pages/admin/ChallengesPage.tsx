import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createCenterChallenge,
  fetchCenterChallenges,
  updateCenterChallengeActive,
} from '../../api/challenges'
import { todayDateString } from '../../api/members'
import { PageHeader } from '../../components/admin/PageHeader'
import { formatSupabaseError } from '../../lib/errors'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import type { CenterChallenge } from '../../types/challenges'
import {
  CHALLENGE_TEMPLATES,
  CHALLENGE_TYPE_LABELS,
  type CenterChallengeType,
} from '../../types/challenges'

function firstDayOfMonth(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function lastDayOfMonth(date = new Date()): string {
  const y = date.getFullYear()
  const m = date.getMonth()
  const last = new Date(y, m + 1, 0)
  const mm = String(last.getMonth() + 1).padStart(2, '0')
  const dd = String(last.getDate()).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

const MVP_TYPES: CenterChallengeType[] = ['ATTENDANCE', 'WORKOUT_LOG', 'PT_SESSION']

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<CenterChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(CHALLENGE_TEMPLATES[0].key)

  const [title, setTitle] = useState(CHALLENGE_TEMPLATES[0].title)
  const [description, setDescription] = useState(CHALLENGE_TEMPLATES[0].description)
  const [challengeType, setChallengeType] = useState<CenterChallengeType>(
    CHALLENGE_TEMPLATES[0].challenge_type,
  )
  const [targetValue, setTargetValue] = useState(String(CHALLENGE_TEMPLATES[0].target_value))
  const [rewardGrowth, setRewardGrowth] = useState(String(CHALLENGE_TEMPLATES[0].reward_growth))
  const [rewardAcorn, setRewardAcorn] = useState(String(CHALLENGE_TEMPLATES[0].reward_acorn))
  const [startDate, setStartDate] = useState(firstDayOfMonth())
  const [endDate, setEndDate] = useState(lastDayOfMonth())

  const template = useMemo(
    () => CHALLENGE_TEMPLATES.find((t) => t.key === selectedTemplate) ?? CHALLENGE_TEMPLATES[0],
    [selectedTemplate],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchCenterChallenges()
      setChallenges(list)
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function applyTemplate(key: string) {
    const t = CHALLENGE_TEMPLATES.find((item) => item.key === key)
    if (!t) return
    setSelectedTemplate(key)
    setTitle(t.title)
    setDescription(t.description)
    setChallengeType(t.challenge_type)
    setTargetValue(String(t.target_value))
    setRewardGrowth(String(t.reward_growth))
    setRewardAcorn(String(t.reward_acorn))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createCenterChallenge({
        title: title.trim(),
        description: description.trim(),
        challenge_type: challengeType,
        target_value: Number(targetValue) || 0,
        reward_growth: Number(rewardGrowth) || 0,
        reward_acorn: Number(rewardAcorn) || 0,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      })
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(challenge: CenterChallenge) {
    setError(null)
    try {
      await updateCenterChallengeActive(challenge.id, !challenge.is_active)
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    }
  }

  const today = todayDateString()

  return (
    <div className="space-y-6">
      <PageHeader
        title="센터 챌린지"
        description="출석·운동일지·PT 완료 목표로 회원 참여를 유도하고 성장 보상을 지급합니다."
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className={`${cardClass} p-5`}>
        <h2 className="text-base font-semibold text-charcoal">챌린지 생성</h2>
        <p className="mt-1 text-sm text-muted">추천 템플릿을 선택하거나 값을 수정해 생성하세요.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {CHALLENGE_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => applyTemplate(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                selectedTemplate === t.key
                  ? 'bg-charcoal text-white'
                  : 'border border-gold/30 bg-white text-charcoal hover:bg-gold/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleCreate} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-muted">제목</span>
            <input
              className={`${inputClass} mt-1`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-muted">설명</span>
            <textarea
              className={`${inputClass} mt-1 min-h-[72px]`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted">유형</span>
            <select
              className={`${inputClass} mt-1`}
              value={challengeType}
              onChange={(e) => setChallengeType(e.target.value as CenterChallengeType)}
            >
              {MVP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CHALLENGE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted">목표 횟수</span>
            <input
              type="number"
              min={1}
              className={`${inputClass} mt-1`}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted">성장치 보상</span>
            <input
              type="number"
              min={0}
              className={`${inputClass} mt-1`}
              value={rewardGrowth}
              onChange={(e) => setRewardGrowth(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted">도토리 보상</span>
            <input
              type="number"
              min={0}
              className={`${inputClass} mt-1`}
              value={rewardAcorn}
              onChange={(e) => setRewardAcorn(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted">시작일</span>
            <input
              type="date"
              className={`${inputClass} mt-1`}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted">종료일</span>
            <input
              type="date"
              className={`${inputClass} mt-1`}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>

          <div className="md:col-span-2">
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? '생성 중…' : '챌린지 생성'}
            </button>
          </div>
        </form>

        <p className="mt-3 text-xs text-muted">
          현재 템플릿: {template.label} · 회원은 성장 탭에서 진행 상황을 확인합니다.
        </p>
      </section>

      <section className={`${cardClass} p-5`}>
        <h2 className="text-base font-semibold text-charcoal">챌린지 목록</h2>
        {loading ? (
          <p className="mt-4 text-sm text-muted">불러오는 중…</p>
        ) : challenges.length === 0 ? (
          <p className="mt-4 text-sm text-muted">등록된 챌린지가 없습니다.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gold/15">
            {challenges.map((c) => {
              const inPeriod = today >= c.start_date && today <= c.end_date
              return (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-charcoal">{c.title}</p>
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-charcoal/80">
                        {CHALLENGE_TYPE_LABELS[c.challenge_type]}
                      </span>
                      {inPeriod && c.is_active && (
                        <span className="rounded-full bg-[#5A9E6F]/15 px-2 py-0.5 text-[10px] font-bold text-[#5A9E6F]">
                          진행 중
                        </span>
                      )}
                      {!c.is_active && (
                        <span className="rounded-full bg-charcoal/10 px-2 py-0.5 text-[10px] text-muted">
                          비활성
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <p className="mt-1 text-sm text-muted">{c.description}</p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      {c.start_date} ~ {c.end_date} · 목표 {c.target_value}회 · +{c.reward_growth}{' '}
                      성장치 · +{c.reward_acorn} 도토리
                    </p>
                  </div>
                  <button
                    type="button"
                    className={btnOutline}
                    onClick={() => void toggleActive(c)}
                  >
                    {c.is_active ? '비활성화' : '활성화'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
