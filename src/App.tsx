import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'

type LayerId =
  | 'principle'
  | 'pillar'
  | 'purpose'
  | 'goal'
  | 'outcome'
  | 'project'
  | 'action'

type Status = 'not-started' | 'active' | 'done'
type TabId = 'home' | 'map' | 'actions' | 'data'

type LifeItem = {
  id: string
  layer: LayerId
  title: string
  note: string
  parentIds: string[]
  status: Status
  createdDate: string
  updatedDate: string
  startDate: string
  completedDate: string
  scheduledDate: string
  dueDate: string
}

type Draft = Omit<LifeItem, 'id'>

type LifeData = {
  version: 2
  exportedAt?: string
  items: LifeItem[]
}

type LegacyItem = Partial<LifeItem> & {
  parentId?: string | null
  createdAt?: string
  updatedAt?: string
}

const STORAGE_KEY = 'ppv-lifeos-data-v1'

const layers: Array<{
  id: LayerId
  label: string
  short: string
  description: string
  parent: LayerId | null
}> = [
  {
    id: 'principle',
    label: '原則',
    short: '原',
    description: '最高判斷標準，代表相信什麼、什麼不可違背。',
    parent: null,
  },
  {
    id: 'pillar',
    label: '支柱',
    short: '支',
    description: '人生長期承重領域，維持整體平衡。',
    parent: 'principle',
  },
  {
    id: 'purpose',
    label: '目的',
    short: '目',
    description: '說明支柱為什麼重要，避免目標變成外界標準。',
    parent: 'pillar',
  },
  {
    id: 'goal',
    label: '目標',
    short: '標',
    description: '在某個目的下想前進的方向。',
    parent: 'purpose',
  },
  {
    id: 'outcome',
    label: '結果',
    short: '果',
    description: '用可觀察成果校準目標是否有實際進展。',
    parent: 'goal',
  },
  {
    id: 'project',
    label: '專案',
    short: '專',
    description: '為了創造結果而需要完成的一組具體工作。',
    parent: 'outcome',
  },
  {
    id: 'action',
    label: '行動',
    short: '行',
    description: '今天或本週可以直接執行的下一步。',
    parent: 'project',
  },
]

const statusLabels: Record<Status, string> = {
  'not-started': '未開始',
  active: '進行中',
  done: '完成',
}

const dateFieldLabels: Array<{ key: keyof Pick<
  Draft,
  'createdDate' | 'startDate' | 'completedDate' | 'scheduledDate' | 'dueDate'
>; label: string }> = [
  { key: 'createdDate', label: '建立日期' },
  { key: 'startDate', label: '開始日期' },
  { key: 'scheduledDate', label: '預計日期' },
  { key: 'dueDate', label: '截止日期' },
  { key: 'completedDate', label: '完成日期' },
]

function App() {
  const [items, setItems] = useState<LifeItem[]>(() => loadItems())
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [activeLayer, setActiveLayer] = useState<LayerId>('principle')
  const [draft, setDraft] = useState<Draft>(() => emptyDraft('principle'))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notice, setNotice] = useState('資料只保存在這台裝置的瀏覽器中。')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, items }))
  }, [items])

  const activeLayerMeta = getLayer(activeLayer)
  const activeLayerItems = items.filter((item) => item.layer === activeLayer)
  const actionItems = items.filter((item) => item.layer === 'action')
  const pendingActions = actionItems.filter((item) => item.status !== 'done')
  const activeProjects = items.filter((item) => item.layer === 'project' && item.status !== 'done')
  const unlinkedItems = items.filter((item) => getLayer(item.layer).parent && item.parentIds.length === 0)

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.title.trim()) {
      setNotice('請先填寫名稱。')
      return
    }

    const layerMeta = getLayer(draft.layer)
    const parentIds = layerMeta.parent ? draft.parentIds : []
    const today = currentDate()

    if (editingId) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                ...draft,
                title: draft.title.trim(),
                note: draft.note.trim(),
                parentIds,
                completedDate:
                  draft.status === 'done' && !draft.completedDate ? today : draft.completedDate,
                updatedDate: today,
              }
            : item,
        ),
      )
      setNotice('已更新物件。')
    } else {
      const nextItem: LifeItem = {
        id: crypto.randomUUID(),
        ...draft,
        title: draft.title.trim(),
        note: draft.note.trim(),
        parentIds,
        completedDate: draft.status === 'done' && !draft.completedDate ? today : draft.completedDate,
        createdDate: draft.createdDate || today,
        updatedDate: today,
      }
      setItems((current) => [nextItem, ...current])
      setActiveLayer(nextItem.layer)
      setNotice(`已建立${layerMeta.label}。`)
    }

    setEditingId(null)
    setDraft(emptyDraft(draft.layer))
  }

  function startEdit(item: LifeItem) {
    setEditingId(item.id)
    setDraft({
      layer: item.layer,
      title: item.title,
      note: item.note,
      parentIds: item.parentIds,
      status: item.status,
      createdDate: item.createdDate,
      updatedDate: item.updatedDate,
      startDate: item.startDate,
      completedDate: item.completedDate,
      scheduledDate: item.scheduledDate,
      dueDate: item.dueDate,
    })
    setActiveLayer(item.layer)
    setActiveTab('map')
    setNotice(`正在編輯：${item.title}`)
  }

  function deleteEditingItem() {
    if (!editingId) return

    const item = items.find((candidate) => candidate.id === editingId)
    if (!item) return

    const hasChildren = items.some((candidate) => candidate.parentIds.includes(editingId))
    if (hasChildren) {
      setNotice('這個物件仍被其他物件連結，請先移除那些連結。')
      return
    }

    setItems((current) => current.filter((candidate) => candidate.id !== editingId))
    setEditingId(null)
    setDraft(emptyDraft(item.layer))
    setNotice(`已刪除${getLayer(item.layer).label}。`)
  }

  function updateStatus(item: LifeItem, status: Status) {
    const today = currentDate()
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? {
              ...candidate,
              status,
              completedDate:
                status === 'done'
                  ? candidate.completedDate || today
                  : item.status === 'done'
                    ? ''
                    : candidate.completedDate,
              updatedDate: today,
            }
          : candidate,
      ),
    )
  }

  function exportJson() {
    const payload: LifeData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      items,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ppv-lifeos-${currentDate()}.json`
    link.click()
    URL.revokeObjectURL(url)
    setNotice('已匯出 JSON，可存到 iPhone「檔案」。')
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { items?: unknown[] }
        if (!Array.isArray(parsed.items)) throw new Error('Invalid file')
        setItems(parsed.items.map(normalizeItem).filter(Boolean) as LifeItem[])
        setEditingId(null)
        setDraft(emptyDraft(activeLayer))
        setNotice('已匯入 JSON。')
      } catch {
        setNotice('匯入失敗，請確認檔案是 PPV Life OS JSON。')
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PPV Life OS</p>
          <h1>原則驅動的人生管理系統</h1>
        </div>
        <button className="icon-button" type="button" onClick={() => setActiveTab('data')} aria-label="資料">
          ⬇
        </button>
      </header>

      <main className="main-panel">
        {activeTab === 'home' && (
          <section className="screen">
            <div className="hero-panel">
              <div>
                <p className="eyebrow">今日焦點</p>
                <h2>{pendingActions[0]?.title ?? '先建立你的第一個行動'}</h2>
                <p>{pendingActions[0]?.note || '行動可以依需要連結到一個或多個上層專案。'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('actions')
                }}
              >
                查看行動
              </button>
            </div>

            <div className="metric-grid">
              <Metric label="待執行行動" value={pendingActions.length} />
              <Metric label="進行中專案" value={activeProjects.length} />
              <Metric label="未連結物件" value={unlinkedItems.length} />
            </div>

            <section className="section-block">
              <div className="section-heading">
                <h2>七層架構</h2>
                <button type="button" onClick={() => setActiveTab('map')}>
                  管理
                </button>
              </div>
              <div className="layer-grid">
                {layers.map((layer) => (
                  <button
                    className="layer-tile"
                    type="button"
                    key={layer.id}
                    onClick={() => {
                      setActiveLayer(layer.id)
                      setDraft(emptyDraft(layer.id))
                      setEditingId(null)
                      setActiveTab('map')
                    }}
                  >
                    <span>{layer.short}</span>
                    <strong>{layer.label}</strong>
                    <small>{items.filter((item) => item.layer === layer.id).length}</small>
                  </button>
                ))}
              </div>
            </section>
          </section>
        )}

        {activeTab === 'map' && (
          <section className="screen two-column">
            <div className="section-block">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">架構瀏覽</p>
                  <h2>{activeLayerMeta.label}</h2>
                </div>
                <span className="count-pill">{activeLayerItems.length}</span>
              </div>
              <p className="muted">{activeLayerMeta.description}</p>
              <div className="segmented" aria-label="選擇層級">
                {layers.map((layer) => (
                  <button
                    className={layer.id === activeLayer ? 'active' : ''}
                    type="button"
                    key={layer.id}
                    onClick={() => {
                      setActiveLayer(layer.id)
                      setDraft(emptyDraft(layer.id))
                      setEditingId(null)
                    }}
                  >
                    {layer.short}
                  </button>
                ))}
              </div>
              <div className="item-list">
                {activeLayerItems.map((item) => (
                  <button
                    className={item.id === editingId ? 'item-card selected' : 'item-card'}
                    type="button"
                    key={item.id}
                    onClick={() => startEdit(item)}
                  >
                    <strong>{item.title}</strong>
                    <span>{statusLabels[item.status]}</span>
                    <small>{connectionSummary(item, items)}</small>
                  </button>
                ))}
                {activeLayerItems.length === 0 && <EmptyState label={`尚未建立${activeLayerMeta.label}`} />}
              </div>
            </div>

            <div className="section-block">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{editingId ? '編輯物件' : '新增物件'}</p>
                  <h2>{getLayer(draft.layer).label}</h2>
                </div>
              </div>
              <ItemForm
                draft={draft}
                items={items}
                editingId={editingId}
                onCancel={() => {
                  setEditingId(null)
                  setDraft(emptyDraft(draft.layer))
                  setNotice('已取消編輯。')
                }}
                onDelete={deleteEditingItem}
                onDraftChange={setDraft}
                onSubmit={saveDraft}
              />
            </div>
          </section>
        )}

        {activeTab === 'actions' && (
          <section className="screen">
            <div className="section-heading">
              <div>
                <p className="eyebrow">下一步</p>
                <h2>行動清單</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraft(emptyDraft('action'))
                  setEditingId(null)
                  setActiveTab('map')
                  setActiveLayer('action')
                }}
              >
                新增行動
              </button>
            </div>
            <div className="action-list">
              {actionItems.map((item) => (
                <article className="action-row" key={item.id}>
                  <button
                    className={item.status === 'done' ? 'check done' : 'check'}
                    type="button"
                    onClick={() => updateStatus(item, item.status === 'done' ? 'active' : 'done')}
                    aria-label="切換完成"
                  >
                    ✓
                  </button>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.note || connectionSummary(item, items)}</p>
                    <small>{dateSummary(item)}</small>
                  </div>
                  <button className="ghost-button" type="button" onClick={() => startEdit(item)}>
                    編輯
                  </button>
                </article>
              ))}
              {actionItems.length === 0 && <EmptyState label="尚未建立行動" />}
            </div>
          </section>
        )}

        {activeTab === 'data' && (
          <section className="screen">
            <div className="section-block">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">資料管理</p>
                  <h2>本機 JSON 備份</h2>
                </div>
              </div>
              <p className="muted">
                目前資料保存在此裝置的瀏覽器本機空間。你可以匯出 JSON 到 iPhone「檔案」，也可以之後再匯入還原。
              </p>
              <div className="data-actions">
                <button type="button" onClick={exportJson}>
                  匯出 JSON
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}>
                  匯入 JSON
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={importJson}
                hidden
              />
            </div>

            <div className="section-block">
              <div className="section-heading">
                <h2>資料狀態</h2>
                <span className="count-pill">{items.length} 個物件</span>
              </div>
              <p className="muted">
                目前允許多個父層，也允許不連結父層；未連結不再視為錯誤，而是保留彈性。
              </p>
            </div>
          </section>
        )}
      </main>

      <p className="notice">{notice}</p>

      <nav className="bottom-nav" aria-label="主要導覽">
        <NavButton label="首頁" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavButton label="架構" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
        <NavButton label="行動" active={activeTab === 'actions'} onClick={() => setActiveTab('actions')} />
        <NavButton label="資料" active={activeTab === 'data'} onClick={() => setActiveTab('data')} />
      </nav>
    </div>
  )
}

function ItemForm({
  draft,
  editingId,
  items,
  onCancel,
  onDelete,
  onDraftChange,
  onSubmit,
}: {
  draft: Draft
  editingId: string | null
  items: LifeItem[]
  onCancel: () => void
  onDelete: () => void
  onDraftChange: (draft: Draft) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const layerMeta = getLayer(draft.layer)
  const parentOptions = layerMeta.parent ? items.filter((item) => item.layer === layerMeta.parent) : []

  function toggleParent(parentId: string) {
    const parentIds = draft.parentIds.includes(parentId)
      ? draft.parentIds.filter((id) => id !== parentId)
      : [...draft.parentIds, parentId]
    onDraftChange({ ...draft, parentIds })
  }

  return (
    <form className="item-form" onSubmit={onSubmit}>
      <label>
        層級
        <select
          value={draft.layer}
          disabled={Boolean(editingId)}
          onChange={(event) => onDraftChange(emptyDraft(event.target.value as LayerId))}
        >
          {layers.map((layer) => (
            <option value={layer.id} key={layer.id}>
              {layer.label}
            </option>
          ))}
        </select>
      </label>

      {layerMeta.parent && (
        <fieldset className="parent-picker">
          <legend>連結{getLayer(layerMeta.parent).label}</legend>
          {parentOptions.length > 0 ? (
            <>
              <div className="parent-options">
                {parentOptions.map((item) => (
                  <label className="check-option" key={item.id}>
                    <input
                      type="checkbox"
                      checked={draft.parentIds.includes(item.id)}
                      onChange={() => toggleParent(item.id)}
                    />
                    <span>{item.title}</span>
                  </label>
                ))}
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => onDraftChange({ ...draft, parentIds: [] })}
              >
                清空連結
              </button>
            </>
          ) : (
            <p className="muted">目前沒有可連結的上層物件，也可以先保持未連結。</p>
          )}
        </fieldset>
      )}

      <label>
        名稱
        <input
          value={draft.title}
          placeholder={`例如：${exampleTitle(draft.layer)}`}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
        />
      </label>
      <label>
        說明
        <textarea
          value={draft.note}
          placeholder="寫下它為什麼重要，或下一步的判斷標準。"
          onChange={(event) => onDraftChange({ ...draft, note: event.target.value })}
        />
      </label>
      <label>
        狀態
        <select
          value={draft.status}
          onChange={(event) => onDraftChange({ ...draft, status: event.target.value as Status })}
        >
          <option value="not-started">未開始</option>
          <option value="active">進行中</option>
          <option value="done">完成</option>
        </select>
      </label>

      <div className="date-grid">
        {dateFieldLabels.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="date"
              value={draft[field.key]}
              onChange={(event) => onDraftChange({ ...draft, [field.key]: event.target.value })}
            />
          </label>
        ))}
        <label>
          修改日期
          <input type="date" value={draft.updatedDate} disabled />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit">{editingId ? '儲存變更' : `建立${layerMeta.label}`}</button>
        {editingId && (
          <>
            <button className="ghost-button" type="button" onClick={onCancel}>
              取消
            </button>
            <button className="danger-button" type="button" onClick={onDelete}>
              刪除
            </button>
          </>
        )}
      </div>
    </form>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={active ? 'active' : ''} type="button" onClick={onClick}>
      {label}
    </button>
  )
}

function EmptyState({ label }: { label: string }) {
  return <div className="empty-state">{label}</div>
}

function loadItems(): LifeItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as { items?: unknown[] }
    if (!Array.isArray(parsed.items)) return []
    return parsed.items.map(normalizeItem).filter(Boolean) as LifeItem[]
  } catch {
    return []
  }
}

function normalizeItem(item: unknown): LifeItem | null {
  if (!item || typeof item !== 'object') return null
  const candidate = item as LegacyItem
  if (typeof candidate.id !== 'string' || !isLayer(candidate.layer) || typeof candidate.title !== 'string') {
    return null
  }

  return {
    id: candidate.id,
    layer: candidate.layer,
    title: candidate.title,
    note: typeof candidate.note === 'string' ? candidate.note : '',
    parentIds: Array.isArray(candidate.parentIds)
      ? candidate.parentIds.filter((id): id is string => typeof id === 'string')
      : candidate.parentId
        ? [candidate.parentId]
        : [],
    status: isStatus(candidate.status) ? candidate.status : 'active',
    createdDate: normalizeDate(candidate.createdDate || candidate.createdAt),
    updatedDate: normalizeDate(candidate.updatedDate || candidate.updatedAt),
    startDate: normalizeDate(candidate.startDate),
    completedDate: normalizeDate(candidate.completedDate),
    scheduledDate: normalizeDate(candidate.scheduledDate),
    dueDate: normalizeDate(candidate.dueDate),
  }
}

function isStatus(status: unknown): status is Status {
  return status === 'not-started' || status === 'active' || status === 'done'
}

function isLayer(layerId: unknown): layerId is LayerId {
  return layers.some((layer) => layer.id === layerId)
}

function getLayer(layerId: LayerId) {
  return layers.find((layer) => layer.id === layerId) ?? layers[0]
}

function emptyDraft(layer: LayerId): Draft {
  const today = currentDate()
  return {
    layer,
    title: '',
    note: '',
    parentIds: [],
    status: layer === 'action' ? 'not-started' : 'active',
    createdDate: today,
    updatedDate: today,
    startDate: '',
    completedDate: '',
    scheduledDate: '',
    dueDate: '',
  }
}

function connectionSummary(item: LifeItem, items: LifeItem[]) {
  const parentCount = item.parentIds.length
  const childCount = items.filter((candidate) => candidate.parentIds.includes(item.id)).length
  return `${parentCount} 個上層連結 / ${childCount} 個下層連結`
}

function dateSummary(item: LifeItem) {
  const parts = [
    item.scheduledDate ? `預計 ${item.scheduledDate}` : '',
    item.dueDate ? `截止 ${item.dueDate}` : '',
    item.completedDate ? `完成 ${item.completedDate}` : '',
  ].filter(Boolean)
  return parts.join(' · ')
}

function currentDate() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeDate(value: unknown) {
  if (typeof value !== 'string' || !value) return ''
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : value.slice(0, 10)
}

function exampleTitle(layer: LayerId) {
  const examples: Record<LayerId, string> = {
    principle: '家庭不可被犧牲',
    pillar: '財務',
    purpose: '建立選擇自由',
    goal: '建立 12 個月緊急預備金',
    outcome: '每月固定投入 20%',
    project: '家庭財務盤點',
    action: '整理本月固定支出',
  }
  return examples[layer]
}

export default App
