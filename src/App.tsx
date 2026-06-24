import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent, FormEvent } from 'react'
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
type TabId = 'home' | 'map' | 'actions' | 'calendar' | 'data'
type PanelMode = 'relationship' | 'edit' | 'create'
type StatusFilter = 'all' | Status
type DateFilter = 'all' | 'overdue' | 'today' | 'this-week' | 'unscheduled' | 'done'
type LinkFilter = 'all' | 'unlinked-parent' | 'has-parent' | 'has-child' | 'no-child'
type SortField =
  | 'createdDate'
  | 'startDate'
  | 'scheduledDate'
  | 'dueDate'
  | 'completedDate'
  | 'updatedDate'
  | 'title'
type SortDirection = 'asc' | 'desc'
type CalendarLayer = Extract<LayerId, 'outcome' | 'project' | 'action'>

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

type CalendarRangeEntry = {
  item: LifeItem
  layer: CalendarLayer
  startDate: string
  endDate: string
}

type CalendarWeek = {
  id: string
  days: MonthDay[]
  startDate: string
  endDate: string
}

type CalendarBarSegment = {
  entry: CalendarRangeEntry
  weekIndex: number
  startColumn: number
  endColumn: number
  lane: number
  continuesBefore: boolean
  continuesAfter: boolean
}

type MonthDay = {
  date: string
  dayNumber: number
  inCurrentMonth: boolean
  isToday: boolean
}

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

type AncestorNode = {
  id: string
  title: string
  layer: LayerId | null
  status: Status | null
  meta: string
  parents: AncestorNode[]
  missing?: boolean
  cycle?: boolean
}

type MapPreference = {
  searchText: string
  statusFilter: StatusFilter
  dateFilter: DateFilter
  linkFilter: LinkFilter
  sortField: SortField
  sortDirection: SortDirection
  controlsCollapsed: boolean
}

const STORAGE_KEY = 'ppv-lifeos-data-v1'
const MAP_PREFERENCES_KEY = 'ppv-lifeos-map-preferences-v1'

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

const calendarLayerIds: CalendarLayer[] = ['action', 'project', 'outcome']
const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']

const statusLabels: Record<Status, string> = {
  'not-started': '未開始',
  active: '進行中',
  done: '完成',
}

const sortFieldLabels: Record<SortField, string> = {
  createdDate: '建立日期',
  startDate: '開始日期',
  scheduledDate: '預計日期',
  dueDate: '截止日期',
  completedDate: '完成日期',
  updatedDate: '修改日期',
  title: '名稱',
}

const defaultMapPreference: MapPreference = {
  searchText: '',
  statusFilter: 'all',
  dateFilter: 'all',
  linkFilter: 'all',
  sortField: 'updatedDate',
  sortDirection: 'desc',
  controlsCollapsed: true,
}

const defaultCalendarLayerFilters: Record<CalendarLayer, boolean> = {
  action: true,
  project: true,
  outcome: true,
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
  const [mapPreferencesByLayer, setMapPreferencesByLayer] = useState<Record<LayerId, MapPreference>>(
    () => loadMapPreferences(),
  )
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [activeLayer, setActiveLayer] = useState<LayerId>('principle')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [panelMode, setPanelMode] = useState<PanelMode>('create')
  const [draft, setDraft] = useState<Draft>(() => emptyDraft('principle'))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthKey(currentDate()))
  const [calendarLayerFilters, setCalendarLayerFilters] = useState<Record<CalendarLayer, boolean>>(
    () => ({ ...defaultCalendarLayerFilters }),
  )
  const [notice, setNotice] = useState('資料只保存在這台裝置的瀏覽器中。')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, items }))
  }, [items])

  useEffect(() => {
    localStorage.setItem(MAP_PREFERENCES_KEY, JSON.stringify(mapPreferencesByLayer))
  }, [mapPreferencesByLayer])

  const activeLayerMeta = getLayer(activeLayer)
  const activeLayerItems = items.filter((item) => item.layer === activeLayer)
  const activeMapPreference = mapPreferencesByLayer[activeLayer] ?? defaultMapPreference
  const visibleLayerItems = getVisibleLayerItems(activeLayerItems, items, activeMapPreference)
  const actionItems = items.filter((item) => item.layer === 'action')
  const pendingActions = actionItems.filter((item) => item.status !== 'done')
  const activeProjects = items.filter((item) => item.layer === 'project' && item.status !== 'done')
  const activeOutcomes = items.filter((item) => item.layer === 'outcome' && item.status === 'active')
  const featuredOutcomes = getFeaturedOutcomes(activeOutcomes)
  const unlinkedItems = items.filter((item) => getLayer(item.layer).parent && item.parentIds.length === 0)
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null
  const calendarEntries = getCalendarRangeEntries(items, calendarLayerFilters, calendarMonth)

  function updateActiveMapPreference(patch: Partial<MapPreference>) {
    setMapPreferencesByLayer((current) => ({
      ...current,
      [activeLayer]: {
        ...(current[activeLayer] ?? defaultMapPreference),
        ...patch,
      },
    }))
  }

  function clearActiveMapPreference() {
    setMapPreferencesByLayer((current) => ({
      ...current,
      [activeLayer]: {
        ...defaultMapPreference,
        controlsCollapsed: current[activeLayer]?.controlsCollapsed ?? defaultMapPreference.controlsCollapsed,
      },
    }))
  }

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
      const savedId = editingId
      setItems((current) =>
        current.map((item) =>
          item.id === savedId
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
      setSelectedItemId(savedId)
      setPanelMode('relationship')
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
      setSelectedItemId(nextItem.id)
      setPanelMode('relationship')
      setNotice(`已建立${layerMeta.label}。`)
    }

    setEditingId(null)
    setDraft(emptyDraft(draft.layer))
  }

  function selectForRelationship(item: LifeItem) {
    setSelectedItemId(item.id)
    setEditingId(null)
    setDraft(emptyDraft(item.layer))
    setActiveLayer(item.layer)
    setPanelMode('relationship')
    setNotice(`正在查看源頭關係：${item.title}`)
  }

  function startCreate(layer: LayerId = activeLayer) {
    setEditingId(null)
    setDraft(emptyDraft(layer))
    setActiveLayer(layer)
    setPanelMode('create')
    setActiveTab('map')
    setNotice(`新增${getLayer(layer).label}`)
  }

  function startEdit(item: LifeItem) {
    setSelectedItemId(item.id)
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
    setPanelMode('edit')
    setNotice(`正在編輯：${item.title}`)
  }

  function openItemRelationship(item: LifeItem) {
    setSelectedItemId(item.id)
    setEditingId(null)
    setDraft(emptyDraft(item.layer))
    setActiveLayer(item.layer)
    setActiveTab('map')
    setPanelMode('relationship')
    setNotice(`正在查看${getLayer(item.layer).label}：${item.title}`)
  }

  function showPreviousCalendarMonth() {
    setCalendarMonth((current) => shiftMonth(current, -1))
  }

  function showNextCalendarMonth() {
    setCalendarMonth((current) => shiftMonth(current, 1))
  }

  function showCurrentCalendarMonth() {
    const today = currentDate()
    setCalendarMonth(getMonthKey(today))
  }

  function toggleCalendarLayer(layer: CalendarLayer) {
    setCalendarLayerFilters((current) => ({
      ...current,
      [layer]: !current[layer],
    }))
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
    setSelectedItemId('')
    setEditingId(null)
    setDraft(emptyDraft(item.layer))
    setPanelMode('create')
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

            <OutcomeFocusList
              items={items}
              outcomes={featuredOutcomes}
              totalCount={activeOutcomes.length}
              onCreate={() => startCreate('outcome')}
              onOpen={openItemRelationship}
            />
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
                <span className="count-pill">
                  {visibleLayerItems.length} / {activeLayerItems.length}
                </span>
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
                      setSelectedItemId('')
                      setEditingId(null)
                      setDraft(emptyDraft(layer.id))
                      setPanelMode('create')
                    }}
                  >
                    {layer.short}
                  </button>
                ))}
              </div>
              <MapListControls
                filteredCount={visibleLayerItems.length}
                preference={activeMapPreference}
                totalCount={activeLayerItems.length}
                onChange={updateActiveMapPreference}
                onClear={clearActiveMapPreference}
              />
              <div className="item-list">
                {visibleLayerItems.map((item) => (
                  <button
                    className={item.id === selectedItemId ? 'item-card selected' : 'item-card'}
                    type="button"
                    key={item.id}
                    onClick={() => selectForRelationship(item)}
                  >
                    <strong>{item.title}</strong>
                    <span>{statusLabels[item.status]}</span>
                    <small>{connectionSummary(item, items)}</small>
                  </button>
                ))}
                {activeLayerItems.length === 0 && <EmptyState label={`尚未建立${activeLayerMeta.label}`} />}
                {activeLayerItems.length > 0 && visibleLayerItems.length === 0 && (
                  <EmptyState label="沒有符合目前篩選的物件" />
                )}
              </div>
            </div>

            <div className="section-block">
              {panelMode === 'relationship' && selectedItem ? (
                <RelationshipPanel
                  item={selectedItem}
                  items={items}
                  onCreate={() => startCreate(activeLayer)}
                  onEdit={() => startEdit(selectedItem)}
                />
              ) : panelMode === 'relationship' ? (
                <RelationshipEmptyState onCreate={() => startCreate(activeLayer)} />
              ) : (
                <>
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">{panelMode === 'edit' ? '編輯物件' : '新增物件'}</p>
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
                      setPanelMode(selectedItem ? 'relationship' : 'create')
                      setNotice('已取消編輯。')
                    }}
                    onDelete={deleteEditingItem}
                    onDraftChange={setDraft}
                    onSubmit={saveDraft}
                  />
                </>
              )}
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
                  startCreate('action')
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

        {activeTab === 'calendar' && (
          <CalendarView
            entries={calendarEntries}
            layerFilters={calendarLayerFilters}
            month={calendarMonth}
            onLayerToggle={toggleCalendarLayer}
            onNextMonth={showNextCalendarMonth}
            onOpenItem={openItemRelationship}
            onPreviousMonth={showPreviousCalendarMonth}
            onToday={showCurrentCalendarMonth}
          />
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
        <NavButton label="月曆" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
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

function OutcomeFocusList({
  items,
  outcomes,
  totalCount,
  onCreate,
  onOpen,
}: {
  items: LifeItem[]
  outcomes: LifeItem[]
  totalCount: number
  onCreate: () => void
  onOpen: (item: LifeItem) => void
}) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">成果交付</p>
          <h2>進行中的結果</h2>
        </div>
        <span className="count-pill">
          {outcomes.length} / {totalCount}
        </span>
      </div>

      {outcomes.length > 0 ? (
        <div className="outcome-list">
          {outcomes.map((item) => (
            <button className="outcome-card" type="button" key={item.id} onClick={() => onOpen(item)}>
              <div className="outcome-card-head">
                <span className="node-badge">{getLayer(item.layer).short}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{statusLabels[item.status]}</small>
                </div>
              </div>
              <p>{item.note || '尚未加入說明。'}</p>
              <div className="outcome-meta">
                <span>{dateSummary(item) || '未排日期'}</span>
                <span>{connectionSummary(item, items)}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="outcome-empty">
          <EmptyState label="目前沒有進行中的結果" />
          <button type="button" onClick={onCreate}>
            新增結果
          </button>
        </div>
      )}
    </section>
  )
}

function CalendarView({
  entries,
  layerFilters,
  month,
  onLayerToggle,
  onNextMonth,
  onOpenItem,
  onPreviousMonth,
  onToday,
}: {
  entries: CalendarRangeEntry[]
  layerFilters: Record<CalendarLayer, boolean>
  month: string
  onLayerToggle: (layer: CalendarLayer) => void
  onNextMonth: () => void
  onOpenItem: (item: LifeItem) => void
  onPreviousMonth: () => void
  onToday: () => void
}) {
  const weeks = getCalendarWeeks(month)
  const segments = buildCalendarWeekSegments(entries, weeks)
  const segmentsByWeek = weeks.map((_, weekIndex) =>
    segments.filter((segment) => segment.weekIndex === weekIndex),
  )
  const hasActiveLayer = calendarLayerIds.some((layer) => layerFilters[layer])

  return (
    <section className="screen">
      <div className="section-block calendar-shell">
        <div className="calendar-toolbar">
          <button className="calendar-icon-button" type="button" onClick={onPreviousMonth} aria-label="上一個月">
            ‹
          </button>
          <div className="calendar-title">
            <p className="eyebrow">月行事曆</p>
            <h2>{formatMonthLabel(month)}</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onToday}>
            今天
          </button>
          <button className="calendar-icon-button" type="button" onClick={onNextMonth} aria-label="下一個月">
            ›
          </button>
        </div>

        <div className="calendar-layer-filters" aria-label="月曆顯示層級">
          {calendarLayerIds.map((layer) => (
            <button
              className={layerFilters[layer] ? 'calendar-filter active' : 'calendar-filter'}
              type="button"
              key={layer}
              onClick={() => onLayerToggle(layer)}
              aria-pressed={layerFilters[layer]}
            >
              <span className={`layer-dot layer-${layer}`} />
              {getLayer(layer).label}
            </button>
          ))}
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {weekdayLabels.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="calendar-range-grid">
          {weeks.map((week, weekIndex) => {
            const weekSegments = segmentsByWeek[weekIndex]
            const laneCount = weekSegments.reduce(
              (maximum, segment) => Math.max(maximum, segment.lane + 1),
              0,
            )
            const weekStyle = {
              '--calendar-week-height': `${66 + Math.max(laneCount, 1) * 28}px`,
            } as CSSProperties

            return (
              <div className="calendar-week-row" key={week.id} style={weekStyle}>
                <div className="calendar-week-days" aria-hidden="true">
                  {week.days.map((day) => (
                    <div
                      className={[
                        'calendar-day-cell',
                        day.inCurrentMonth ? '' : 'outside',
                        day.isToday ? 'today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      key={day.date}
                    >
                      <span className="calendar-day-number">{day.dayNumber}</span>
                    </div>
                  ))}
                </div>
                <div
                  className="calendar-week-bars"
                  aria-label={`${week.startDate} 到 ${week.endDate} 的期間項目`}
                >
                  {weekSegments.map((segment) => {
                    const { entry } = segment
                    const barStyle = {
                      gridColumn: `${segment.startColumn} / ${segment.endColumn + 1}`,
                      gridRow: segment.lane + 1,
                    } as CSSProperties
                    const label = `${getLayer(entry.layer).label} ${entry.item.title}，${entry.startDate} 到 ${entry.endDate}，${statusLabels[entry.item.status]}`

                    return (
                      <button
                        className={[
                          'calendar-bar',
                          `layer-${entry.layer}`,
                          segment.continuesBefore ? 'continues-before' : '',
                          segment.continuesAfter ? 'continues-after' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        type="button"
                        key={`${entry.item.id}-${weekIndex}-${segment.startColumn}-${segment.endColumn}`}
                        style={barStyle}
                        title={label}
                        aria-label={label}
                        onClick={() => onOpenItem(entry.item)}
                      >
                        <span className="calendar-bar-title">{entry.item.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {!hasActiveLayer ? (
          <EmptyState label="請至少開啟一個層級篩選" />
        ) : entries.length === 0 ? (
          <EmptyState label="這個月沒有具有開始或截止日期的行動、專案或結果" />
        ) : (
          <p className="calendar-hint">橫條使用開始日期到截止日期；缺一個日期時顯示為單日。</p>
        )}
      </div>
    </section>
  )
}

function RelationshipPanel({
  item,
  items,
  onCreate,
  onEdit,
}: {
  item: LifeItem
  items: LifeItem[]
  onCreate: () => void
  onEdit: () => void
}) {
  const tree = buildAncestorTree(item, items, new Set([item.id]))

  return (
    <article className="relationship-panel">
      <div className="relationship-hero">
        <span className="node-badge current">{getLayer(item.layer).short}</span>
        <div>
          <p className="eyebrow">源頭關係</p>
          <h2>{item.title}</h2>
          <p className="muted">{itemMeta(item)}</p>
        </div>
      </div>

      <div className="relationship-actions">
        <button type="button" onClick={onEdit}>
          編輯
        </button>
        <button className="ghost-button" type="button" onClick={onCreate}>
          新增物件
        </button>
      </div>

      <div className="relationship-tree" aria-label="往上追溯父級關係">
        <div className="tree-current">
          <span className="node-badge current">{getLayer(item.layer).short}</span>
          <div>
            <strong>{item.title}</strong>
            <small>目前物件</small>
          </div>
        </div>

        {tree.parents.length > 0 ? (
          <div className="ancestor-list">
            <p className="tree-label">往上父級</p>
            {tree.parents.map((parent) => (
              <AncestorBranch depth={0} key={parent.id} node={parent} />
            ))}
          </div>
        ) : (
          <EmptyState label="此物件目前沒有上層連結" />
        )}
      </div>
    </article>
  )
}

function RelationshipEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relationship-empty">
      <EmptyState label="請從左側選擇一個物件，或建立新的架構物件。" />
      <button type="button" onClick={onCreate}>
        新增物件
      </button>
    </div>
  )
}

function MapListControls({
  filteredCount,
  preference,
  totalCount,
  onChange,
  onClear,
}: {
  filteredCount: number
  preference: MapPreference
  totalCount: number
  onChange: (patch: Partial<MapPreference>) => void
  onClear: () => void
}) {
  const sortLabel = sortFieldLabels[preference.sortField]
  const directionLabel = preference.sortDirection === 'asc' ? '升冪' : '降冪'

  return (
    <div className="map-controls" aria-label="架構列表篩選與排序">
      <div className="map-controls-summary">
        <button
          type="button"
          onClick={() => onChange({ controlsCollapsed: !preference.controlsCollapsed })}
        >
          {preference.controlsCollapsed ? '展開篩選排序' : '收合篩選排序'}
        </button>
        <span className="filter-count">
          {filteredCount} / {totalCount}
        </span>
        <span className="filter-summary">
          {sortLabel} · {directionLabel}
        </span>
        <button className="ghost-button clear-filter-button" type="button" onClick={onClear}>
          清除篩選
        </button>
      </div>

      {!preference.controlsCollapsed && (
        <div className="map-controls-body">
          <label className="map-control search-control">
            搜尋
            <input
              value={preference.searchText}
              placeholder="名稱或說明"
              onChange={(event) => onChange({ searchText: event.target.value })}
            />
          </label>

          <label className="map-control">
            狀態
            <select
              value={preference.statusFilter}
              onChange={(event) => onChange({ statusFilter: event.target.value as StatusFilter })}
            >
              <option value="all">全部</option>
              <option value="not-started">未開始</option>
              <option value="active">進行中</option>
              <option value="done">完成</option>
            </select>
          </label>

          <label className="map-control">
            日期
            <select
              value={preference.dateFilter}
              onChange={(event) => onChange({ dateFilter: event.target.value as DateFilter })}
            >
              <option value="all">全部</option>
              <option value="overdue">逾期</option>
              <option value="today">今天</option>
              <option value="this-week">本週</option>
              <option value="unscheduled">未排日期</option>
              <option value="done">已完成</option>
            </select>
          </label>

          <label className="map-control">
            連結
            <select
              value={preference.linkFilter}
              onChange={(event) => onChange({ linkFilter: event.target.value as LinkFilter })}
            >
              <option value="all">全部</option>
              <option value="unlinked-parent">未連結上層</option>
              <option value="has-parent">有上層</option>
              <option value="has-child">有下層</option>
              <option value="no-child">無下層</option>
            </select>
          </label>

          <label className="map-control">
            排序
            <select
              value={preference.sortField}
              onChange={(event) => onChange({ sortField: event.target.value as SortField })}
            >
              <option value="updatedDate">修改日期</option>
              <option value="createdDate">建立日期</option>
              <option value="startDate">開始日期</option>
              <option value="scheduledDate">預計日期</option>
              <option value="dueDate">截止日期</option>
              <option value="completedDate">完成日期</option>
              <option value="title">名稱</option>
            </select>
          </label>

          <div className="map-control compact-control">
            <span>方向</span>
            <button
              type="button"
              onClick={() =>
                onChange({ sortDirection: preference.sortDirection === 'asc' ? 'desc' : 'asc' })
              }
            >
              {directionLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AncestorBranch({ node, depth }: { node: AncestorNode; depth: number }) {
  return (
    <div className="ancestor-branch" style={{ marginLeft: depth * 14 }}>
      <div
        className={[
          'tree-node',
          node.missing ? 'missing' : '',
          node.cycle ? 'cycle' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="node-badge">{node.layer ? getLayer(node.layer).short : '?'}</span>
        <div>
          <strong>{node.title}</strong>
          <small>{node.meta}</small>
        </div>
      </div>
      {node.parents.length > 0 && (
        <div className="ancestor-parents">
          {node.parents.map((parent) => (
            <AncestorBranch depth={depth + 1} key={parent.id} node={parent} />
          ))}
        </div>
      )}
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
    if (!stored) return []
    const parsed = JSON.parse(stored) as { items?: unknown[] }
    if (!Array.isArray(parsed.items)) return []
    return parsed.items.map(normalizeItem).filter(Boolean) as LifeItem[]
  } catch {
    return []
  }
}

function loadMapPreferences(): Record<LayerId, MapPreference> {
  const defaults = Object.fromEntries(
    layers.map((layer) => [layer.id, defaultMapPreference]),
  ) as Record<LayerId, MapPreference>

  try {
    const stored = localStorage.getItem(MAP_PREFERENCES_KEY)
    if (!stored) return defaults
    const parsed = JSON.parse(stored) as Partial<Record<LayerId, Partial<MapPreference>>>

    return Object.fromEntries(
      layers.map((layer) => [
        layer.id,
        normalizeMapPreference(parsed[layer.id] ?? defaultMapPreference),
      ]),
    ) as Record<LayerId, MapPreference>
  } catch {
    return defaults
  }
}

function normalizeMapPreference(preference: Partial<MapPreference>): MapPreference {
  return {
    searchText: typeof preference.searchText === 'string' ? preference.searchText : '',
    statusFilter: isStatusFilter(preference.statusFilter) ? preference.statusFilter : 'all',
    dateFilter: isDateFilter(preference.dateFilter) ? preference.dateFilter : 'all',
    linkFilter: isLinkFilter(preference.linkFilter) ? preference.linkFilter : 'all',
    sortField: isSortField(preference.sortField) ? preference.sortField : 'updatedDate',
    sortDirection: preference.sortDirection === 'asc' || preference.sortDirection === 'desc'
      ? preference.sortDirection
      : 'desc',
    controlsCollapsed:
      typeof preference.controlsCollapsed === 'boolean'
        ? preference.controlsCollapsed
        : defaultMapPreference.controlsCollapsed,
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

function isStatusFilter(filter: unknown): filter is StatusFilter {
  return filter === 'all' || isStatus(filter)
}

function isDateFilter(filter: unknown): filter is DateFilter {
  return (
    filter === 'all' ||
    filter === 'overdue' ||
    filter === 'today' ||
    filter === 'this-week' ||
    filter === 'unscheduled' ||
    filter === 'done'
  )
}

function isLinkFilter(filter: unknown): filter is LinkFilter {
  return (
    filter === 'all' ||
    filter === 'unlinked-parent' ||
    filter === 'has-parent' ||
    filter === 'has-child' ||
    filter === 'no-child'
  )
}

function isSortField(field: unknown): field is SortField {
  return (
    field === 'createdDate' ||
    field === 'startDate' ||
    field === 'scheduledDate' ||
    field === 'dueDate' ||
    field === 'completedDate' ||
    field === 'updatedDate' ||
    field === 'title'
  )
}

function isCalendarLayer(layer: unknown): layer is CalendarLayer {
  return layer === 'action' || layer === 'project' || layer === 'outcome'
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

function getVisibleLayerItems(
  layerItems: LifeItem[],
  allItems: LifeItem[],
  preference: MapPreference,
) {
  const searchText = preference.searchText.trim().toLowerCase()

  return layerItems
    .filter((item) => {
      const matchesSearch =
        !searchText ||
        item.title.toLowerCase().includes(searchText) ||
        item.note.toLowerCase().includes(searchText)
      const matchesStatus =
        preference.statusFilter === 'all' || item.status === preference.statusFilter
      const matchesDate = matchesDateFilter(item, preference.dateFilter)
      const matchesLink = matchesLinkFilter(item, allItems, preference.linkFilter)

      return matchesSearch && matchesStatus && matchesDate && matchesLink
    })
    .sort((left, right) => compareItems(left, right, preference))
}

function getFeaturedOutcomes(outcomes: LifeItem[]) {
  return [...outcomes].sort(compareOutcomeFocus).slice(0, 5)
}

function compareOutcomeFocus(left: LifeItem, right: LifeItem) {
  const leftDate = getOutcomePriorityDate(left)
  const rightDate = getOutcomePriorityDate(right)

  if (!leftDate && !rightDate) {
    return right.updatedDate.localeCompare(left.updatedDate) || left.title.localeCompare(right.title, 'zh-Hant')
  }
  if (!leftDate) return 1
  if (!rightDate) return -1

  const compared = leftDate.localeCompare(rightDate)
  return compared === 0 ? left.title.localeCompare(right.title, 'zh-Hant') : compared
}

function getOutcomePriorityDate(item: LifeItem) {
  return item.dueDate || item.scheduledDate
}

function getCalendarRangeEntries(
  items: LifeItem[],
  layerFilters: Record<CalendarLayer, boolean>,
  month: string,
) {
  const monthStart = month
  const monthEnd = getMonthEnd(month)
  const entries: CalendarRangeEntry[] = []

  items.forEach((item) => {
    if (!isCalendarLayer(item.layer) || !layerFilters[item.layer]) return

    const range = getCalendarRange(item)
    if (!range || !rangesOverlap(range.startDate, range.endDate, monthStart, monthEnd)) return

    entries.push({
      item,
      layer: item.layer,
      startDate: range.startDate,
      endDate: range.endDate,
    })
  })

  return entries.sort(compareCalendarRangeEntries)
}

function getCalendarRange(item: LifeItem) {
  if (!item.startDate && !item.dueDate) return null

  const startDate = item.startDate || item.dueDate
  const endDate = item.dueDate || item.startDate

  return {
    startDate: minDate(startDate, endDate),
    endDate: maxDate(startDate, endDate),
  }
}

function compareCalendarRangeEntries(left: CalendarRangeEntry, right: CalendarRangeEntry) {
  const startCompared = left.startDate.localeCompare(right.startDate)
  if (startCompared !== 0) return startCompared

  const endCompared = left.endDate.localeCompare(right.endDate)
  if (endCompared !== 0) return endCompared

  const layerCompared = calendarLayerIds.indexOf(left.layer) - calendarLayerIds.indexOf(right.layer)
  if (layerCompared !== 0) return layerCompared

  return left.item.title.localeCompare(right.item.title, 'zh-Hant')
}

function getCalendarWeeks(month: string): CalendarWeek[] {
  const monthDays = getMonthDays(month)

  return Array.from({ length: 6 }, (_, weekIndex) => {
    const days = monthDays.slice(weekIndex * 7, weekIndex * 7 + 7)

    return {
      id: days[0].date,
      days,
      startDate: days[0].date,
      endDate: days[6].date,
    }
  })
}

function buildCalendarWeekSegments(entries: CalendarRangeEntry[], weeks: CalendarWeek[]) {
  const segments: CalendarBarSegment[] = []

  weeks.forEach((week, weekIndex) => {
    const laneEnds: string[] = []
    const weekEntries = entries
      .filter((entry) => rangesOverlap(entry.startDate, entry.endDate, week.startDate, week.endDate))
      .sort(compareCalendarRangeEntries)

    weekEntries.forEach((entry) => {
      const segmentStart = maxDate(entry.startDate, week.startDate)
      const segmentEnd = minDate(entry.endDate, week.endDate)
      const reusableLane = laneEnds.findIndex((endDate) => endDate < segmentStart)
      const lane = reusableLane === -1 ? laneEnds.length : reusableLane

      laneEnds[lane] = segmentEnd
      segments.push({
        entry,
        weekIndex,
        startColumn: daysBetween(week.startDate, segmentStart) + 1,
        endColumn: daysBetween(week.startDate, segmentEnd) + 1,
        lane,
        continuesBefore: entry.startDate < segmentStart,
        continuesAfter: entry.endDate > segmentEnd,
      })
    })
  })

  return segments
}

function getMonthDays(month: string): MonthDay[] {
  const firstDay = parseLocalDate(month)
  const mondayFirstWeekday = firstDay.getDay() || 7
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - mondayFirstWeekday + 1)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const formatted = formatLocalDate(date)

    return {
      date: formatted,
      dayNumber: date.getDate(),
      inCurrentMonth: getMonthKey(formatted) === month,
      isToday: formatted === currentDate(),
    }
  })
}

function getMonthKey(date: string) {
  return `${date.slice(0, 7)}-01`
}

function getMonthEnd(month: string) {
  const nextMonth = parseLocalDate(shiftMonth(month, 1))
  nextMonth.setDate(0)
  return formatLocalDate(nextMonth)
}

function shiftMonth(month: string, offset: number) {
  const date = parseLocalDate(month)
  date.setMonth(date.getMonth() + offset)
  date.setDate(1)
  return formatLocalDate(date)
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-')
  return `${year} 年 ${Number(monthNumber)} 月`
}

function parseLocalDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function minDate(left: string, right: string) {
  return left <= right ? left : right
}

function maxDate(left: string, right: string) {
  return left >= right ? left : right
}

function rangesOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return leftStart <= rightEnd && leftEnd >= rightStart
}

function daysBetween(startDate: string, endDate: string) {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

function matchesDateFilter(item: LifeItem, filter: DateFilter) {
  if (filter === 'all') return true
  if (filter === 'done') return item.status === 'done'
  if (filter === 'unscheduled') return !hasAnyScheduleDate(item)
  if (filter === 'overdue') return isOverdue(item)
  if (filter === 'today') return isToday(getScheduleDate(item))
  if (filter === 'this-week') return isThisWeek(getScheduleDate(item))
  return true
}

function matchesLinkFilter(item: LifeItem, allItems: LifeItem[], filter: LinkFilter) {
  const hasParent = item.parentIds.length > 0
  const hasChild = allItems.some((candidate) => candidate.parentIds.includes(item.id))

  if (filter === 'all') return true
  if (filter === 'unlinked-parent') return Boolean(getLayer(item.layer).parent) && !hasParent
  if (filter === 'has-parent') return hasParent
  if (filter === 'has-child') return hasChild
  if (filter === 'no-child') return !hasChild
  return true
}

function compareItems(left: LifeItem, right: LifeItem, preference: MapPreference) {
  const direction = preference.sortDirection === 'asc' ? 1 : -1

  if (preference.sortField === 'title') {
    return left.title.localeCompare(right.title, 'zh-Hant') * direction
  }

  const leftValue = left[preference.sortField]
  const rightValue = right[preference.sortField]

  if (!leftValue && !rightValue) return left.title.localeCompare(right.title, 'zh-Hant')
  if (!leftValue) return 1
  if (!rightValue) return -1

  const compared = leftValue.localeCompare(rightValue)
  return compared === 0 ? left.title.localeCompare(right.title, 'zh-Hant') : compared * direction
}

function connectionSummary(item: LifeItem, items: LifeItem[]) {
  const parentCount = item.parentIds.length
  const childCount = items.filter((candidate) => candidate.parentIds.includes(item.id)).length
  return `${parentCount} 個上層連結 / ${childCount} 個下層連結`
}

function buildAncestorTree(
  item: LifeItem,
  items: LifeItem[],
  visitedIds: Set<string> = new Set(),
): AncestorNode {
  return {
    id: item.id,
    title: item.title,
    layer: item.layer,
    status: item.status,
    meta: itemMeta(item),
    parents: item.parentIds.map((parentId) => {
      if (visitedIds.has(parentId)) {
        return {
          id: `cycle-${parentId}`,
          title: '循環連結',
          layer: null,
          status: null,
          meta: '偵測到循環父層，已停止追溯。',
          parents: [],
          cycle: true,
        }
      }

      const parent = items.find((candidate) => candidate.id === parentId)
      if (!parent) {
        return {
          id: `missing-${parentId}`,
          title: '遺失的連結',
          layer: null,
          status: null,
          meta: `找不到父層 ID：${parentId}`,
          parents: [],
          missing: true,
        }
      }

      return buildAncestorTree(parent, items, new Set([...visitedIds, parentId]))
    }),
  }
}

function itemMeta(item: LifeItem) {
  return [getLayer(item.layer).label, statusLabels[item.status], dateSummary(item) || `建立 ${item.createdDate}`]
    .filter(Boolean)
    .join(' · ')
}

function dateSummary(item: LifeItem) {
  const parts = [
    item.scheduledDate ? `預計 ${item.scheduledDate}` : '',
    item.dueDate ? `截止 ${item.dueDate}` : '',
    item.completedDate ? `完成 ${item.completedDate}` : '',
  ].filter(Boolean)
  return parts.join(' · ')
}

function getScheduleDate(item: LifeItem) {
  return item.scheduledDate || item.dueDate
}

function hasAnyScheduleDate(item: LifeItem) {
  return Boolean(getScheduleDate(item))
}

function isOverdue(item: LifeItem) {
  const date = getScheduleDate(item)
  return Boolean(date && item.status !== 'done' && date < currentDate())
}

function isToday(date: string) {
  return Boolean(date && date === currentDate())
}

function isThisWeek(date: string) {
  if (!date) return false

  const target = new Date(`${date}T00:00:00`)
  const now = new Date()
  const day = now.getDay() || 7
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - day + 1)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return target >= weekStart && target <= weekEnd
}

function currentDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
