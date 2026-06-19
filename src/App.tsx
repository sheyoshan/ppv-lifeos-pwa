import { useEffect, useMemo, useRef, useState } from 'react'
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
  parentId: string | null
  status: Status
  createdAt: string
  updatedAt: string
}

type Draft = {
  layer: LayerId
  title: string
  note: string
  parentId: string
  status: Status
}

type LifeData = {
  version: 1
  exportedAt?: string
  items: LifeItem[]
}

const STORAGE_KEY = 'ppv-lifeos-data-v1'

const layers: Array<{
  id: LayerId
  label: string
  short: string
  description: string
  parent: LayerId | null
  child: LayerId | null
}> = [
  {
    id: 'principle',
    label: '原則',
    short: '原',
    description: '最高判斷標準，代表相信什麼、什麼不可違背。',
    parent: null,
    child: 'pillar',
  },
  {
    id: 'pillar',
    label: '支柱',
    short: '支',
    description: '人生長期承重領域，維持整體平衡。',
    parent: 'principle',
    child: 'purpose',
  },
  {
    id: 'purpose',
    label: '目的',
    short: '目',
    description: '說明支柱為什麼重要，避免目標變成外界標準。',
    parent: 'pillar',
    child: 'goal',
  },
  {
    id: 'goal',
    label: '目標',
    short: '標',
    description: '在某個目的下想前進的方向。',
    parent: 'purpose',
    child: 'outcome',
  },
  {
    id: 'outcome',
    label: '結果',
    short: '果',
    description: '用可觀察成果校準目標是否有實際進展。',
    parent: 'goal',
    child: 'project',
  },
  {
    id: 'project',
    label: '專案',
    short: '專',
    description: '為了創造結果而需要完成的一組具體工作。',
    parent: 'outcome',
    child: 'action',
  },
  {
    id: 'action',
    label: '行動',
    short: '行',
    description: '今天或本週可以直接執行的下一步。',
    parent: 'project',
    child: null,
  },
]

const statusLabels: Record<Status, string> = {
  'not-started': '未開始',
  active: '進行中',
  done: '完成',
}

const starterItems: LifeItem[] = [
  makeItem('principle', '長期主義', '真正重要的事，必須經得起時間檢驗。', null, 'active'),
  makeItem('pillar', '健康', '身體是所有承諾與責任的底層資產。', 'seed-principle-1', 'active'),
  makeItem('purpose', '保持長期體能', '讓我有能力陪伴家人、承擔工作，並維持清醒的生活節奏。', 'seed-pillar-1', 'active'),
  makeItem('goal', '建立穩定運動習慣', '先追求可持續，不追求一次性的爆發。', 'seed-purpose-1', 'active'),
  makeItem('outcome', '每週運動四次', '用週頻率觀察這個目標是否真正進入生活。', 'seed-goal-1', 'active'),
  makeItem('project', '六月運動計畫', '安排跑步、肌力與恢復，讓行動變得具體。', 'seed-outcome-1', 'active'),
  makeItem('action', '今天慢跑 20 分鐘', '低門檻完成，讓系統先開始運轉。', 'seed-project-1', 'not-started'),
].map((item, index) => ({ ...item, id: `seed-${layers[index].id}-1` }))

function makeItem(
  layer: LayerId,
  title: string,
  note: string,
  parentId: string | null,
  status: Status,
): LifeItem {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    layer,
    title,
    note,
    parentId,
    status,
    createdAt: now,
    updatedAt: now,
  }
}

function App() {
  const [items, setItems] = useState<LifeItem[]>(() => loadItems())
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [activeLayer, setActiveLayer] = useState<LayerId>('principle')
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? '')
  const [draft, setDraft] = useState<Draft>(() => emptyDraft('principle'))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notice, setNotice] = useState('資料只保存在這台裝置的瀏覽器中。')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items }))
  }, [items])

  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0] ?? null
  const activeLayerMeta = getLayer(activeLayer)
  const activeLayerItems = items.filter((item) => item.layer === activeLayer)
  const actionItems = items.filter((item) => item.layer === 'action')
  const pendingActions = actionItems.filter((item) => item.status !== 'done')
  const activeProjects = items.filter((item) => item.layer === 'project' && item.status !== 'done')
  const lonelyItems = items.filter((item) => getLayer(item.layer).parent && !item.parentId)

  const selectedPath = useMemo(
    () => (selectedItem ? buildPath(selectedItem, items) : []),
    [selectedItem, items],
  )

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.title.trim()) {
      setNotice('請先填寫名稱。')
      return
    }

    const layerMeta = getLayer(draft.layer)
    if (layerMeta.parent && !draft.parentId) {
      setNotice(`請選擇所屬${getLayer(layerMeta.parent).label}。`)
      return
    }

    if (editingId) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                title: draft.title.trim(),
                note: draft.note.trim(),
                parentId: layerMeta.parent ? draft.parentId : null,
                status: draft.status,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      )
      setNotice('已更新物件。')
      setEditingId(null)
    } else {
      const nextItem = makeItem(
        draft.layer,
        draft.title.trim(),
        draft.note.trim(),
        layerMeta.parent ? draft.parentId : null,
        draft.status,
      )
      setItems((current) => [nextItem, ...current])
      setSelectedId(nextItem.id)
      setActiveLayer(nextItem.layer)
      setNotice(`已建立${layerMeta.label}。`)
    }

    setDraft(emptyDraft(draft.layer))
  }

  function startEdit(item: LifeItem) {
    setEditingId(item.id)
    setDraft({
      layer: item.layer,
      title: item.title,
      note: item.note,
      parentId: item.parentId ?? '',
      status: item.status,
    })
    setActiveLayer(item.layer)
    setActiveTab('map')
  }

  function deleteItem(item: LifeItem) {
    const hasChildren = items.some((candidate) => candidate.parentId === item.id)
    if (hasChildren) {
      setNotice('這個物件仍有下層連結，請先移動或刪除子項目。')
      return
    }

    setItems((current) => current.filter((candidate) => candidate.id !== item.id))
    setSelectedId(items.find((candidate) => candidate.id !== item.id)?.id ?? '')
    setNotice(`已刪除${getLayer(item.layer).label}。`)
  }

  function updateStatus(item: LifeItem, status: Status) {
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? { ...candidate, status, updatedAt: new Date().toISOString() }
          : candidate,
      ),
    )
  }

  function exportJson() {
    const payload: LifeData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      items,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ppv-lifeos-${new Date().toISOString().slice(0, 10)}.json`
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
        const parsed = JSON.parse(String(reader.result)) as LifeData
        if (!Array.isArray(parsed.items)) throw new Error('Invalid file')
        setItems(parsed.items.filter(isLifeItem))
        setSelectedId(parsed.items[0]?.id ?? '')
        setNotice('已匯入 JSON。')
      } catch {
        setNotice('匯入失敗，請確認檔案是 PPV Life OS JSON。')
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  function resetStarterData() {
    setItems(starterItems)
    setSelectedId(starterItems[0]?.id ?? '')
    setNotice('已載入範例資料。')
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
                <p>{pendingActions[0]?.note || '每個行動都會一路連回你的原則。'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('actions')
                  if (pendingActions[0]) setSelectedId(pendingActions[0].id)
                }}
              >
                查看行動
              </button>
            </div>

            <div className="metric-grid">
              <Metric label="待執行行動" value={pendingActions.length} />
              <Metric label="進行中專案" value={activeProjects.length} />
              <Metric label="總物件" value={items.length} />
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

            <section className="section-block">
              <div className="section-heading">
                <h2>目前對齊路徑</h2>
              </div>
              <PathView path={selectedPath} />
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
                    onClick={() => setActiveLayer(layer.id)}
                  >
                    {layer.short}
                  </button>
                ))}
              </div>
              <div className="item-list">
                {activeLayerItems.map((item) => (
                  <button
                    className={item.id === selectedItem?.id ? 'item-card selected' : 'item-card'}
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <strong>{item.title}</strong>
                    <span>{statusLabels[item.status]}</span>
                    <small>{childCount(item, items)} 個下層連結</small>
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
                }}
                onDraftChange={setDraft}
                onSubmit={saveDraft}
              />
            </div>

            {selectedItem && (
              <div className="section-block wide-detail">
                <DetailCard
                  item={selectedItem}
                  items={items}
                  onDelete={deleteItem}
                  onEdit={startEdit}
                  onStatus={updateStatus}
                />
              </div>
            )}
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
                    <p>{item.note || buildPath(item, items).map((pathItem) => pathItem.title).join(' / ')}</p>
                  </div>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id)
                      setActiveTab('map')
                      setActiveLayer('action')
                    }}
                  >
                    詳情
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
                <button className="ghost-button" type="button" onClick={resetStarterData}>
                  載入範例
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
                <h2>資料健康</h2>
                <span className={lonelyItems.length ? 'warning-pill' : 'count-pill'}>
                  {lonelyItems.length ? `${lonelyItems.length} 個未連結` : '完整'}
                </span>
              </div>
              <p className="muted">
                第一版採單一父層連結，確保每個下層物件都能回到明確的上層方向。
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
  onDraftChange,
  onSubmit,
}: {
  draft: Draft
  editingId: string | null
  items: LifeItem[]
  onCancel: () => void
  onDraftChange: (draft: Draft) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const layerMeta = getLayer(draft.layer)
  const parentOptions = layerMeta.parent ? items.filter((item) => item.layer === layerMeta.parent) : []

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
        <label>
          所屬{getLayer(layerMeta.parent).label}
          <select
            value={draft.parentId}
            onChange={(event) => onDraftChange({ ...draft, parentId: event.target.value })}
          >
            <option value="">請選擇</option>
            {parentOptions.map((item) => (
              <option value={item.id} key={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
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
      <div className="form-actions">
        <button type="submit">{editingId ? '儲存變更' : `建立${layerMeta.label}`}</button>
        {editingId && (
          <button className="ghost-button" type="button" onClick={onCancel}>
            取消
          </button>
        )}
      </div>
    </form>
  )
}

function DetailCard({
  item,
  items,
  onDelete,
  onEdit,
  onStatus,
}: {
  item: LifeItem
  items: LifeItem[]
  onDelete: (item: LifeItem) => void
  onEdit: (item: LifeItem) => void
  onStatus: (item: LifeItem, status: Status) => void
}) {
  const layerMeta = getLayer(item.layer)
  const parent = item.parentId ? items.find((candidate) => candidate.id === item.parentId) : null
  const children = items.filter((candidate) => candidate.parentId === item.id)
  const path = buildPath(item, items)

  return (
    <article className="detail-card">
      <div className="detail-head">
        <span>{layerMeta.label}</span>
        <strong>{statusLabels[item.status]}</strong>
      </div>
      <h2>{item.title}</h2>
      <p>{item.note || '尚未加入說明。'}</p>
      <div className="detail-meta">
        <span>上層：{parent?.title ?? '無'}</span>
        <span>下層：{children.length}</span>
      </div>
      <PathView path={path} />
      <div className="detail-actions">
        <button type="button" onClick={() => onEdit(item)}>
          編輯
        </button>
        <button type="button" onClick={() => onStatus(item, item.status === 'done' ? 'active' : 'done')}>
          {item.status === 'done' ? '標記進行中' : '標記完成'}
        </button>
        <button className="danger-button" type="button" onClick={() => onDelete(item)}>
          刪除
        </button>
      </div>
    </article>
  )
}

function PathView({ path }: { path: LifeItem[] }) {
  if (path.length === 0) return <EmptyState label="尚未選擇物件" />

  return (
    <div className="path-view">
      {path.map((item) => (
        <div className="path-node" key={item.id}>
          <span>{getLayer(item.layer).short}</span>
          <strong>{item.title}</strong>
        </div>
      ))}
    </div>
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
    if (!stored) return starterItems
    const parsed = JSON.parse(stored) as LifeData
    if (!Array.isArray(parsed.items)) return starterItems
    return parsed.items.filter(isLifeItem)
  } catch {
    return starterItems
  }
}

function isLifeItem(item: unknown): item is LifeItem {
  if (!item || typeof item !== 'object') return false
  const candidate = item as LifeItem
  return (
    typeof candidate.id === 'string' &&
    layers.some((layer) => layer.id === candidate.layer) &&
    typeof candidate.title === 'string'
  )
}

function getLayer(layerId: LayerId) {
  return layers.find((layer) => layer.id === layerId) ?? layers[0]
}

function emptyDraft(layer: LayerId): Draft {
  return {
    layer,
    title: '',
    note: '',
    parentId: '',
    status: layer === 'action' ? 'not-started' : 'active',
  }
}

function childCount(item: LifeItem, items: LifeItem[]) {
  return items.filter((candidate) => candidate.parentId === item.id).length
}

function buildPath(item: LifeItem, items: LifeItem[]) {
  const path: LifeItem[] = [item]
  let cursor = item

  while (cursor.parentId) {
    const parent = items.find((candidate) => candidate.id === cursor.parentId)
    if (!parent) break
    path.unshift(parent)
    cursor = parent
  }

  return path
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
