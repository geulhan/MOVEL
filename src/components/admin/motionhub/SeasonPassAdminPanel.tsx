import { useCallback, useEffect, useState } from 'react'
import { createCenterSeason, fetchCenterSeasons, updateSeasonActive } from '../../../api/season'
import { todayDateString } from '../../../api/members'
import { formatSupabaseError } from '../../../lib/errors'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../../styles/theme'
import type { Season } from '../../../types/season'
import { firstDayOfMonth, lastDayOfMonth } from '../../../lib/adminDateUtils'

function seasonTitleForMonth(date = new Date()): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const names = [
    'Winter',
    'Winter',
    'Spring',
    'Spring',
    'Spring',
    'Summer',
    'Summer',
    'Summer',
    'Autumn',
    'Autumn',
    'Autumn',
    'Winter',
  ]
  return `${y} ${names[m - 1]} Season`
}

export function SeasonPassAdminPanel() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState(seasonTitleForMonth())
  const [description, setDescription] = useState('운동하고 시즌 보상을 모아보세요!')
  const [startDate, setStartDate] = useState(firstDayOfMonth())
  const [endDate, setEndDate] = useState(lastDayOfMonth())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSeasons(await fetchCenterSeasons())
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createCenterSeason({
        title: title.trim(),
        description: description.trim(),
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

  async function toggleActive(season: Season) {
    setError(null)
    try {
      await updateSeasonActive(season.id, !season.is_active)
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    }
  }

  const today = todayDateString()

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className={`${cardClass} p-5`}>
        <h2 className="text-base font-semibold text-charcoal">시즌 생성</h2>
        <p className="mt-1 text-sm text-muted">
          생성 시 LV1~20 기본 보상(도토리·한정 아이템)이 자동 등록됩니다.
        </p>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-muted">시즌 이름</span>
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
              {saving ? '생성 중…' : '시즌 생성 (무료 패스)'}
            </button>
          </div>
        </form>
      </section>

      <section className={`${cardClass} p-5`}>
        <h2 className="text-base font-semibold text-charcoal">시즌 목록</h2>
        {loading ? (
          <p className="mt-4 text-sm text-muted">불러오는 중…</p>
        ) : seasons.length === 0 ? (
          <p className="mt-4 text-sm text-muted">등록된 시즌이 없습니다.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gold/15">
            {seasons.map((s) => {
              const inPeriod = today >= s.start_date && today <= s.end_date
              return (
                <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-charcoal">{s.title}</p>
                      {inPeriod && s.is_active && (
                        <span className="rounded-full bg-[#5A9E6F]/15 px-2 py-0.5 text-[10px] font-bold text-[#5A9E6F]">
                          진행 중
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted">{s.description}</p>
                    <p className="mt-1 text-xs text-muted">
                      {s.start_date} ~ {s.end_date} · LV{s.max_level}
                    </p>
                  </div>
                  <button type="button" className={btnOutline} onClick={() => void toggleActive(s)}>
                    {s.is_active ? '비활성화' : '활성화'}
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
