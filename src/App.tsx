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
type ParentStatusView = 'open' | 'all' | 'done'
type SortField =
  | 'createdDate'
  | 'startDate'
  | 'dueDate'
  | 'deadlineDate'
  | 'completedDate'
  | 'updatedDate'
  | 'title'
type SortDirection = 'asc' | 'desc'
type CalendarLayer = Extract<LayerId, 'outcome' | 'project' | 'action'>
type TimelineLayer = Extract<LayerId, 'purpose' | 'goal' | 'outcome' | 'project' | 'action'>
type RoadmapLayer = Extract<LayerId, 'goal' | 'outcome' | 'project'>
type HorizonLayer = Extract<LayerId, 'purpose' | 'goal'>
type CalendarViewMode = 'month' | 'quarter' | 'horizon'
type CalendarStatusFilter = 'all' | Status | 'overdue' | 'upcoming'
type CalendarRiskTone = 'normal' | 'buffer' | 'late' | 'deadline-risk' | 'done'
type ReviewGranularity = 'week' | 'month' | 'quarter' | 'year'
type ArchiveMode = 'actions' | 'projects-actions'

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
  dueDate: string
  deadlineDate: string
}

type Draft = Omit<LifeItem, 'id'>

type CalendarRangeEntry = {
  item: LifeItem
  layer: TimelineLayer
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

type CalendarDeadlineSegment = {
  entry: CalendarRangeEntry
  weekIndex: number
  startColumn: number
  endColumn: number
  lane: number
}

type CalendarDeadlineFlag = {
  entry: CalendarRangeEntry
  weekIndex: number
  column: number
  lane: number
  tone: CalendarRiskTone
  label: string
}

type TimelineColumn = {
  id: string
  label: string
  sublabel: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

type TimelineSegment = {
  entry: CalendarRangeEntry
  startColumn: number
  endColumn: number
  lane: number
  continuesBefore: boolean
  continuesAfter: boolean
}

type TimelineLayerBand = {
  layer: TimelineLayer
  startLane: number
  laneCount: number
}

type MonthDay = {
  date: string
  dayNumber: number
  inCurrentMonth: boolean
  isToday: boolean
}

type ProjectManagementProject = {
  project: LifeItem
  actions: LifeItem[]
}

type ProjectManagementOutcome = {
  outcome: LifeItem
  projects: ProjectManagementProject[]
}

type WeeklyRange = {
  startDate: string
  endDate: string
}

type ReviewRange = WeeklyRange & {
  label: string
}

type WeeklyMetricId =
  | 'completed-actions'
  | 'overdue'
  | 'unlinked'
  | 'upcoming'
  | 'active-outcomes'
  | 'active-projects'

type AlignmentIssueKind =
  | 'action-without-project'
  | 'project-without-outcome'
  | 'outcome-without-goal'
  | 'active-outcome-without-active-project'
  | 'active-project-without-active-action'
  | 'done-project-with-open-action'
  | 'done-outcome-with-open-project'
  | 'overdue-open-item'
  | 'deadline-risk-project-without-active-action'

type AlignmentSeverity = 'high' | 'medium' | 'low'

type AlignmentIssue = {
  kind: AlignmentIssueKind
  item: LifeItem
  title: string
  description: string
  severity: AlignmentSeverity
  createAction?: {
    label: string
    layer: LayerId
    parentId: string
  }
}

type WeeklyMetric = {
  id: WeeklyMetricId
  label: string
  items: LifeItem[]
}

type ReviewMetric = {
  id: string
  label: string
  items: LifeItem[]
}

type ReviewSummary = {
  label: string
  value: number
  tone: AlignmentSeverity
}

type ReviewSection = {
  id: string
  eyebrow: string
  title: string
  items: LifeItem[]
  emptyLabel: string
}

type ReviewData = {
  intro: string
  summaries: ReviewSummary[]
  metrics: ReviewMetric[]
  sections: ReviewSection[]
}

type AlignmentIssueGroup = {
  kind: AlignmentIssueKind
  label: string
  count: number
}

type LifeData = {
  version: 3
  exportedAt?: string
  items: LifeItem[]
}

type DataStatus = {
  totalCount: number
  estimatedJsonBytes: number
  coreCounts: Record<LayerId, number>
  project: {
    total: number
    open: number
    done: number
  }
  action: {
    total: number
    open: number
    done: number
  }
  archiveCandidates: {
    actions: number
    projects: number
  }
}

type DataSummary = {
  totalItems: number
  coreItems: number
  projectItems: number
  actionItems: number
  doneItems: number
  layerCounts: Record<LayerId, number>
}

type ImportPreview = {
  fileName: string
  fileSize: number
  exportedAt: string
  version: string
  totalItemCount: number
  validItemCount: number
  invalidItemCount: number
  summary: DataSummary
  validItems: LifeItem[]
}

type ImportAnalysisResult = {
  preview: ImportPreview
}

type ArchiveCandidateResult = {
  projects: LifeItem[]
  actions: LifeItem[]
  protectedActionCount: number
}

type ArchiveImpactSummary = {
  projectCount: number
  actionCount: number
  retainedPillars: number
  retainedGoals: number
  retainedOutcomes: number
  protectedActionCount: number
  estimatedBytesBefore: number
  estimatedBytesAfter: number
  estimatedBytesReduction: number
}

type ArchivePreview = ArchiveCandidateResult & {
  mode: ArchiveMode
  createdAt: string
  items: LifeItem[]
  itemIds: string[]
  impact: ArchiveImpactSummary
}

type ArchiveExportPayload = {
  version: 3
  exportedAt: string
  archive: {
    mode: ArchiveMode
    label: string
    itemCount: number
    projectCount: number
    actionCount: number
    removedFromMainData: false
  }
  items: LifeItem[]
}

type ItemInput = Partial<LifeItem> & Record<string, unknown>

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

type EncyclopediaArticle = {
  id: string
  eyebrow: string
  title: string
  concept: string[]
  why: string[]
  practice: string[]
  mistakes: string[]
  examples: string[]
}

type EncyclopediaSection = {
  id: string
  label: string
  articles: EncyclopediaArticle[]
}

const STORAGE_KEY = 'ppv-lifeos-data-v1'
const MAP_PREFERENCES_KEY = 'ppv-lifeos-map-preferences-v1'
const ACTION_ARCHIVE_DAYS = 90
const PROJECT_ARCHIVE_DAYS = 180

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

const coreLayerIds: LayerId[] = ['principle', 'pillar', 'purpose', 'goal', 'outcome']
const calendarLayerIds: CalendarLayer[] = ['outcome', 'project', 'action']
const roadmapLayerIds: RoadmapLayer[] = ['goal', 'outcome', 'project']
const horizonLayerIds: HorizonLayer[] = ['purpose', 'goal']
const timelineLayerIds: TimelineLayer[] = ['purpose', 'goal', 'outcome', 'project', 'action']
const calendarViewModeIds: CalendarViewMode[] = ['month', 'quarter', 'horizon']
const calendarStatusFilterIds: CalendarStatusFilter[] = [
  'all',
  'not-started',
  'active',
  'done',
  'overdue',
  'upcoming',
]
const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']

const statusLabels: Record<Status, string> = {
  'not-started': '未開始',
  active: '進行中',
  done: '完成',
}

const calendarStatusFilterLabels: Record<CalendarStatusFilter, string> = {
  all: '全部',
  'not-started': '未開始',
  active: '進行中',
  done: '完成',
  overdue: '逾期',
  upcoming: '7天內',
}

const archiveModeLabels: Record<ArchiveMode, string> = {
  actions: '完成行動',
  'projects-actions': '完成專案與行動',
}

const calendarViewModeLabels: Record<CalendarViewMode, { label: string; eyebrow: string; description: string }> = {
  month: {
    label: '月視圖',
    eyebrow: '執行時間表',
    description: '行動、專案、結果的本月執行與交付壓力。',
  },
  quarter: {
    label: '季度路線圖',
    eyebrow: '目標推進',
    description: '從本週開始的滾動 13 週，用來檢查目標、結果、專案是否形成推進路線。',
  },
  horizon: {
    label: '長期視圖',
    eyebrow: '目的方向',
    description: '36 個月跨度，用來檢查目的、目標與支柱方向是否持續對齊。',
  },
}

const severityLabels: Record<AlignmentSeverity, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const reviewGranularityIds: ReviewGranularity[] = ['week', 'month', 'quarter', 'year']

const reviewGranularityLabels: Record<ReviewGranularity, string> = {
  week: '週',
  month: '月',
  quarter: '季',
  year: '年',
}

const reviewGranularityNames: Record<ReviewGranularity, string> = {
  week: '週回顧',
  month: '月回顧',
  quarter: '季回顧',
  year: '年回顧',
}

const alignmentIssueLabels: Record<AlignmentIssueKind, string> = {
  'action-without-project': '行動未連專案',
  'project-without-outcome': '專案未連結果',
  'outcome-without-goal': '結果未連目標',
  'active-outcome-without-active-project': '結果無進行中專案',
  'active-project-without-active-action': '專案無進行中行動',
  'done-project-with-open-action': '完成專案仍有行動',
  'done-outcome-with-open-project': '完成結果仍有專案',
  'overdue-open-item': '逾期未完成',
  'deadline-risk-project-without-active-action': '截止風險',
}

const sortFieldLabels: Record<SortField, string> = {
  createdDate: '建立日期',
  startDate: '開始日期',
  dueDate: '應完成日',
  deadlineDate: '截止日期',
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

const defaultRoadmapLayerFilters: Record<RoadmapLayer, boolean> = {
  goal: true,
  outcome: true,
  project: true,
}

const defaultHorizonLayerFilters: Record<HorizonLayer, boolean> = {
  purpose: true,
  goal: true,
}

const NEXT_ACTION_LIMIT = 7

const dateFieldLabels: Array<{ key: keyof Pick<
  Draft,
  'createdDate' | 'startDate' | 'completedDate' | 'dueDate' | 'deadlineDate'
>; label: string }> = [
  { key: 'createdDate', label: '建立日期' },
  { key: 'startDate', label: '開始日期' },
  { key: 'dueDate', label: '應完成日' },
  { key: 'deadlineDate', label: '截止日期' },
  { key: 'completedDate', label: '完成日期' },
]

const encyclopediaSections: EncyclopediaSection[] = [
  {
    id: 'foundation',
    label: '系統基礎',
    articles: [
      {
        id: 'overview',
        eyebrow: '系統總覽',
        title: 'PPV Life OS 是什麼',
        concept: [
          'PPV Life OS 是一套原則驅動的人生管理系統。它把人生拆成七個層次：原則、支柱、目的、目標、結果、專案、行動。',
          '它不是單純把事情排得更滿，而是讓每個行動都能回到「我相信什麼、我重視什麼、我正在創造什麼成果」。',
        ],
        why: [
          '只管理任務，容易變成忙碌清單；只談價值，容易停在空泛想像。PPV 的價值在於把價值和行動接起來。',
          '當生活壓力變大時，這套系統能幫你判斷哪些事情應該前進、暫停、放棄或重新定義。',
        ],
        practice: [
          '先建立少數真正不可違背的原則，再建立人生支柱。每個支柱寫出目的，接著才設定目標、結果、專案與行動。',
          '每天看行動，每週看專案與結果，每月看目標與支柱，每季回到原則與目的。',
        ],
        mistakes: [
          '把 PPV 當成更複雜的待辦清單。',
          '一次建立太多物件，卻沒有形成可以執行的下一步。',
          '只有上層理念，沒有可觀察的結果和專案。',
        ],
        examples: [
          '如果你的原則是「家庭不可被長期犧牲」，那事業專案就要能被檢查：它是否正在吞掉不可替代的家庭時間？',
          '如果結果是「完成家庭財務儀表板」，專案可以是「整理現金流」，行動可以是「匯出上個月信用卡明細」。',
        ],
      },
      {
        id: 'system-flow',
        eyebrow: '運作邏輯',
        title: '由上而下對齊，由下而上校準',
        concept: [
          '由上而下，是用原則決定方向，用支柱維持平衡，用目的確認意義。',
          '由下而上，是用行動、專案與結果檢查現實：你每天做的事，是否真的支撐你說重要的事。',
        ],
        why: [
          '人生系統最大的風險不是沒有努力，而是努力和方向脫節。',
          '上層如果不落地，會變成口號；下層如果不回看上層，會變成盲目執行。',
        ],
        practice: [
          '建立新行動時，盡量連到專案；建立新專案時，問它要創造哪個結果。',
          '每週找出三種斷裂：沒有上層的行動、沒有結果的專案、沒有專案推進的結果。',
        ],
        mistakes: [
          '把未連結物件視為錯誤。未連結有時代表想法還在發酵，只是要定期整理。',
          '把每個物件硬連到不自然的父層，造成系統看似完整但判斷失真。',
        ],
        examples: [
          '一個臨時行動可以先不連結，但週回顧時要判斷：它應該成為某個專案的一部分，還是只是雜務？',
          '一個專案如果找不到結果，通常代表它只是活動，不是成果創造。',
        ],
      },
      {
        id: 'gtd-relationship',
        eyebrow: 'GTD',
        title: 'GTD 與 PPV 的關係',
        concept: [
          'GTD 強調捕捉、釐清、組織、回顧與執行，幫你把腦中的開放迴圈變成可信任的外部系統。',
          'PPV 接在更高一層：它不只問事情如何被處理，也問這件事為什麼值得被處理。',
        ],
        why: [
          '沒有 GTD，PPV 可能太抽象；沒有 PPV，GTD 可能只會讓你更有效率地完成不重要的事。',
          '兩者結合後，收件匣中的雜訊會被整理成行動、專案或被明確放棄。',
        ],
        practice: [
          'Capture：先把想到的事情放進暫存清單。Clarify：判斷它是行動、專案、結果，還是只是參考資料。',
          'Organize：放入 PPV 層級並連結父層。Review：檢查連結是否合理。Engage：選擇今天真正要做的行動。',
        ],
        mistakes: [
          '把每個捕捉到的想法都立刻做成專案。',
          '只整理任務，不問它是否服務目的或支柱。',
          '用 GTD 清空焦慮，卻沒有用 PPV 決定取捨。',
        ],
        examples: [
          '收件匣寫著「研究保險」。釐清後可能是專案「家庭保障盤點」，結果是「完成保單缺口表」，目的則是「保護家庭承重能力」。',
        ],
      },
    ],
  },
  {
    id: 'layers',
    label: '七大層次',
    articles: [
      {
        id: 'principle-guide',
        eyebrow: '原則 Principles',
        title: '原則：不可違背的判斷標準',
        concept: [
          '原則是最高判斷標準，用來回答：什麼事情即使有短期好處，也不能長期違背。',
          '好的原則不是漂亮句子，而是在衝突時能幫你做取捨的標準。',
        ],
        why: [
          '沒有原則，目標容易被外界標準牽著走；有原則，取捨才不只靠情緒和壓力。',
        ],
        practice: [
          '用「我不會為了 X 犧牲 Y」或「當 A 和 B 衝突時，我優先保護 C」來寫。',
          '原則數量要少，先保留 3 到 7 條，能真正用來決策即可。',
        ],
        mistakes: [
          '把願望寫成原則，例如「我要成功」。這比較像目標，不是判斷標準。',
          '原則太多，導致每一條都沒有約束力。',
        ],
        examples: [
          '「不以長期健康交換短期績效。」',
          '「家庭關係不能成為事業成長的燃料。」',
        ],
      },
      {
        id: 'pillar-guide',
        eyebrow: '支柱 Pillars',
        title: '支柱：人生的承重領域',
        concept: [
          '支柱是人生長期需要維持承重的領域，例如健康、家庭、事業、財務、學習、信仰、孩子教育。',
          '支柱不是專案分類，而是人生平衡的結構。',
        ],
        why: [
          '單一領域的成功，如果以其他支柱崩塌為代價，通常不是可持續的成功。',
          '支柱讓你在追求目標時看見整體，不被某一個領域的壓力完全吞沒。',
        ],
        practice: [
          '先列出目前最需要承重的 5 到 8 個領域，再問每個領域是否真的需要長期維護。',
          '每月檢查支柱是否失衡：哪一個長期沒有專案或結果？哪一個吸走過多行動？',
        ],
        mistakes: [
          '把支柱切得太細，例如把每個工作任務都當成支柱。',
          '只放正在燃燒的領域，忽略安靜但重要的領域。',
        ],
        examples: [
          '「健康」是支柱；「減重 5 公斤」不是支柱，而可能是目標或結果。',
          '「孩子教育」是支柱；「完成暑假閱讀計畫」比較像專案。',
        ],
      },
      {
        id: 'purpose-guide',
        eyebrow: '目的 Purposes',
        title: '目的：每個支柱為什麼重要',
        concept: [
          '目的說明某個支柱為什麼值得被照顧。它把支柱從外在標籤轉成內在理由。',
          '目的不是 KPI，而是意義判準。',
        ],
        why: [
          '沒有目的，支柱容易變成社會期待。你可能在追求財務、事業或學習，卻忘了它們服務什麼生活。',
        ],
        practice: [
          '對每個支柱問三次「為什麼」。例如：為什麼財務重要？為了安全感。為什麼安全感重要？為了在家庭需要時有選擇權。',
          '把目的寫成能提醒自己的句子，而不是外界聽起來厲害的說法。',
        ],
        mistakes: [
          '把目的寫成數字，例如「存到 300 萬」。這比較像目標或結果。',
          '寫成別人的期待，例如「看起來有成就」。',
        ],
        examples: [
          '支柱「財務」的目的：建立選擇自由，讓家庭在變動時仍有安全邊界。',
          '支柱「健康」的目的：保有陪伴家人與長期創造的身體能力。',
        ],
      },
      {
        id: 'goal-guide',
        eyebrow: '目標 Goals',
        title: '目標：長期前進方向',
        concept: [
          '目標是在某個目的下想前進的方向。它比結果更長期，比目的更具體。',
          '好的目標會描述方向與狀態，不必每次都直接等於可交付物。',
        ],
        why: [
          '目標讓目的有推進方向，也讓結果不會變成零散成果。',
        ],
        practice: [
          '用 3 到 12 個月的尺度描述目標，並讓它能產生多個結果。',
          '建立目標後，至少定義一個可觀察結果，否則很難知道是否真的前進。',
        ],
        mistakes: [
          '把單一步驟寫成目標，例如「打電話給會計師」。這是行動。',
          '目標太抽象，例如「變得更好」，導致無法拆結果。',
        ],
        examples: [
          '目的：建立選擇自由。目標：建立 12 個月家庭緊急預備金。',
          '目的：保有長期健康。目標：建立可持續的睡眠與運動節奏。',
        ],
      },
      {
        id: 'outcome-guide',
        eyebrow: '結果 Outcomes',
        title: '結果：可觀察的交付成果',
        concept: [
          '結果用來判斷目標是否真的有進展。它應該是可以被看見、被交付、被驗收的狀態。',
          '結果不是努力程度，而是努力留下的證據。',
        ],
        why: [
          '沒有結果，目標容易只停留在意圖。結果讓你知道專案是否真的有產出。',
          '首頁聚焦進行中的結果，就是為了提醒目前真正要交付的是什麼。',
        ],
        practice: [
          '寫結果時使用「完成、建立、交付、取得、達成」這類可驗收動詞。',
          '每個目標至少放 1 到 3 個結果，並設定應完成日或截止日期。',
        ],
        mistakes: [
          '把活動寫成結果，例如「持續研究」。研究本身不是結果，研究報告或決策表才是。',
          '結果太多，導致焦點分散。',
        ],
        examples: [
          '「完成家庭月現金流儀表板」是結果；「整理財務」太模糊。',
          '「孩子完成 20 篇閱讀心得」是結果；「培養閱讀習慣」比較像目標。',
        ],
      },
      {
        id: 'project-guide',
        eyebrow: '專案 Projects',
        title: '專案：創造結果的一組工作',
        concept: [
          '專案是為了創造某個結果而需要完成的一組工作。它通常需要多個行動，不是一口氣能完成。',
          '專案的完成條件應該指向結果，而不是指向忙碌。',
        ],
        why: [
          '專案把結果拆成可以管理的工作範圍，避免結果太大而無法行動。',
        ],
        practice: [
          '建立專案時先寫清楚完成條件，再列出下一步行動。',
          '一個專案最好能在數天到數週內推進；若長期停滯，可能需要拆小。',
        ],
        mistakes: [
          '專案沒有下一步行動。',
          '專案名稱像主題資料夾，例如「健康」，而不是一組可完成工作。',
        ],
        examples: [
          '結果：完成家庭財務儀表板。專案：整理收入與固定支出資料。',
          '結果：完成年度健檢追蹤表。專案：蒐集檢查報告並預約回診。',
        ],
      },
      {
        id: 'action-guide',
        eyebrow: '行動 Actions',
        title: '行動：今天或本週可以執行的下一步',
        concept: [
          '行動是最底層，也是系統真正發生的地方。它必須具體到今天或本週可以開始。',
          '好的行動會描述一個明確動作，而不是模糊意圖。',
        ],
        why: [
          '再好的原則、目標和專案，如果沒有下一步，就不會進入現實。',
          '行動讓你在忙亂時不必重新思考整個人生，只要執行已經對齊過的下一步。',
        ],
        practice: [
          '用動詞開頭，例如「打電話」、「整理」、「寄出」、「預約」、「閱讀第 1 章」。',
          '如果一個行動超過 30 到 60 分鐘仍無法開始，通常要再拆小。',
        ],
        mistakes: [
          '把願望寫成行動，例如「改善健康」。',
          '行動沒有連到專案，久了會讓每日清單和人生方向脫節。',
        ],
        examples: [
          '「預約牙醫檢查」比「處理健康」更像行動。',
          '「整理 2026-06 信用卡明細」比「做財務規劃」更可執行。',
        ],
      },
    ],
  },
  {
    id: 'practice',
    label: '規劃與對齊',
    articles: [
      {
        id: 'planning-seven-layers',
        eyebrow: '規劃流程',
        title: '如何規劃七大層次',
        concept: [
          '規劃七層不是一次寫完人生藍圖，而是建立一條能從價值走到行動的鏈路。',
          '你可以從上往下建立，也可以從目前手上的混亂行動往上反推。',
        ],
        why: [
          '完整鏈路讓你知道：今天做的事，不只是待辦事項，而是某個結果、目標、目的與原則的延伸。',
        ],
        practice: [
          'Top-down：原則 -> 支柱 -> 目的 -> 目標 -> 結果 -> 專案 -> 行動。',
          'Bottom-up：拿一個正在做的行動，問它屬於哪個專案；專案創造哪個結果；結果服務哪個目標。',
          '每次只完成一條鏈路即可，不需要一次填滿所有人生領域。',
        ],
        mistakes: [
          '從工具欄位開始填空，而不是從真實問題開始。',
          '為了完整而建立假物件，導致系統變重。',
        ],
        examples: [
          '支柱：健康。目的：保有長期陪伴與創造能力。目標：建立穩定睡眠。結果：連續 30 天 23:30 前上床。專案：設計晚間關機流程。行動：今晚 22:45 把手機放到客廳。',
        ],
      },
      {
        id: 'alignment-guide',
        eyebrow: 'Alignment',
        title: '如何保持連結與對齊',
        concept: [
          'Alignment 是檢查每個物件是否合理連到上層意義與下層現實。',
          '父層代表來源與理由；子層代表落地方式與推進證據。',
        ],
        why: [
          '沒有對齊，系統會分裂成兩半：上層很漂亮，下層很忙。',
          '對齊不是要求每件事都有完美父層，而是讓你知道哪些事情已對齊、哪些事情仍待釐清。',
        ],
        practice: [
          '允許複數父層：一個專案可能同時服務家庭與財務。',
          '允許未連結：臨時任務、探索想法、尚未歸類的承諾可以先放著，但要在週回顧整理。',
          '每週檢查三種清單：未連結物件、沒有子層的高層物件、沒有進展的結果。',
        ],
        mistakes: [
          '硬把所有物件連起來，造成錯誤的安全感。',
          '永遠不整理未連結物件，讓系統變成雜物箱。',
        ],
        examples: [
          '「替孩子整理學習資料」可能同時連到家庭與孩子教育兩個支柱。',
          '「研究新工具」若找不到服務的結果，可能只是好奇，不一定需要成為專案。',
        ],
      },
      {
        id: 'dates-status-rhythm',
        eyebrow: '日期與狀態',
        title: '日期、狀態與月曆節奏',
        concept: [
          '日期不是壓迫自己的工具，而是幫你看見時間承諾。狀態則用來表示物件目前的位置。',
          '月曆橫條用開始日期到應完成日顯示行動、專案與結果的計畫工作跨度。',
        ],
        why: [
          '沒有日期，承諾容易漂浮；日期太多，系統會變成壓力來源。重點是讓時間和成果保持可見。',
        ],
        practice: [
          '建立日期與修改日期由系統幫你留下脈絡。開始日期代表何時開始投入。應完成日代表計畫上應該交付的日期。',
          '截止日期代表絕對不能晚於此日的死線，用來保留 buffer。完成日期用來留下實際結束時間。',
          '未開始表示還不該投入；進行中表示正在推進；完成表示已達到完成條件。',
        ],
        mistakes: [
          '把所有日期都填滿，卻不知道每個日期的用途。',
          '完成狀態只是心理上想結束，但結果或專案其實沒有達到完成條件。',
        ],
        examples: [
          '專案 6/1 開始、6/14 截止，月曆會顯示兩週跨度，提醒它不是單日任務。',
          '只有應完成日的行動會顯示成單日，代表它只有一個清楚計畫完成點。',
        ],
      },
      {
        id: 'review-cadence',
        eyebrow: '回顧節奏',
        title: '每日、週、月、季、年怎麼用',
        concept: [
          'PPV 的節奏不是每天重寫人生，而是在不同時間尺度看不同層次。',
          '越短週期越看執行，越長週期越看方向。週回顧校準行動，月回顧校準結果，季回顧校準目標，年回顧校準人生架構。',
        ],
        why: [
          '如果每天都在檢查原則，會太重；如果一年才看一次行動，現實早就偏航。',
          '不同顆粒的回顧要回答不同問題，否則月回顧會變成放大的週回顧，年回顧會變成很長的待辦清單。',
        ],
        practice: [
          '每日：看首頁進行中的結果與行動清單，選出今天最重要的下一步。',
          '每週：檢查行動、專案與結果，更新狀態、日期與父層連結，確保下一步仍在推進結果。',
          '每月：檢查結果是否交付、目標是否有成果支撐、支柱是否完全沒有推進。',
          '每季：檢查目標是否仍值得投入，結果組合是否支撐目的，支柱是否長期失衡。',
          '每年：回到原則、支柱與目的，判斷今年的成果是否真的符合你相信的方向。',
          '歷史週/月/季/年回顧以目前資料即時計算，不保存當時 snapshot；因此它適合回看成果與期間，不適合還原過去某一天的完整狀態。',
        ],
        mistakes: [
          '每日回顧做得像年度規劃，導致太耗能。',
          '只做行動清單，不做週回顧，最後行動會慢慢和結果斷線。',
          '把月回顧只做成工作量統計，卻沒有檢查結果是否真正交付。',
          '年回顧只新增更多目標，卻沒有檢查支柱、目的與原則是否仍然真實。',
        ],
        examples: [
          '週回顧時問：本週完成了哪些行動？它們推進了哪些專案？專案有沒有創造結果？',
          '月回顧時問：本月真正交付了哪些結果？哪些目標沒有任何成果支撐？',
          '季回顧時問：這一季的目標是否仍值得投入？下季應該保留、暫停或重寫哪些目標？',
          '年回顧時問：今年的成果是否保護了我重視的支柱？有沒有新的原則需要被寫下？',
        ],
      },
    ],
  },
  {
    id: 'maintenance',
    label: '系統維護',
    articles: [
      {
        id: 'data-maintenance-archive',
        eyebrow: '資料維護',
        title: '資料維護與封存策略',
        concept: [
          'PPV Life OS 的資料不是平均成長。原則、支柱、目的、目標與結果是長期脈絡資料；專案與行動是執行流水資料。',
          '資料狀態面板的用途，是讓你看見目前系統的重量主要來自哪裡，而不是把所有物件都當成同一種負擔。',
        ],
        why: [
          '原則到結果即使完成，也常常是回顧人生方向、季度成果與長期模式的證據，通常應該留在主資料中。',
          '專案與行動累積最快。大量完成行動留在主資料中，會逐漸影響列表、篩選、月曆、週回顧與 JSON 匯入匯出的速度。',
          '先看資料狀態，再決定是否封存，可以避免為了清爽而破壞上層脈絡。',
        ],
        practice: [
          '先看總物件數與 JSON 估算大小。幾百 KB 通常不用擔心；數 MB 以上時，匯入匯出與手機端切換可能開始變慢。',
          '再看核心層資料。原則、支柱、目的、目標、結果即使完成也不預設封存，因為它們保留的是方向、意義與成果證據。',
          '接著看執行層資料。若已完成行動遠高於未完成行動，代表日常流水正在累積；若已完成專案很多，代表可以開始整理歷史執行資料。',
          '行動封存候選可用保守標準：已完成、有完成日期、完成超過 90 天。',
          '專案封存候選可用保守標準：已完成、有完成日期、完成超過 180 天，且底下沒有未完成行動。',
          '封存前先確認相關結果仍留在主資料中，並確認專案底下沒有仍需要推進的行動。',
          '封存匯出採四步驟：先看封存預覽，先匯出完整備份，再匯出封存檔，最後才從主資料移除封存物件。',
          '封存完成專案時，只會一併移除完全隸屬於封存專案的已完成行動；如果行動也連到其他未封存專案，會保留在主資料。',
          '保留的多父層行動會移除指向封存專案的父層連結，避免主資料保留遺失連結。',
          '匯入資料前先看預覽。確認匯入檔案的版本、有效物件數、無效物件數與各層分布，再決定是否取代目前資料。',
          '取代匯入前一定先匯出目前資料。瀏覽器本機資料一旦被取代，就應該靠這份備份檔回復，而不是期待 app 自動保留上一版。',
        ],
        mistakes: [
          '把完成的結果也大量移出主資料，導致未來回顧只剩任務紀錄，失去成果脈絡。',
          '只因為總物件數變多就急著清理，而沒有先看膨脹來源是否其實集中在完成行動。',
          '封存專案前沒有檢查底下未完成行動，造成執行承諾被藏到歷史檔案中。',
          '把封存當成刪除。封存應該是把歷史流水移到備份檔，而不是讓人生紀錄消失。',
          '封存後還期待週/月/季/年回顧完整顯示已移出的行動與專案。第一版回顧仍只看主資料，因此封存會讓舊期間的執行細節變少。',
          '看到匯入檔案名稱正確就直接覆蓋。檔案可能是舊備份、測試資料或部分匯出，應該先看預覽數字再取代。',
        ],
        examples: [
          '如果系統有 1,200 個物件，其中原則到結果只有 250 個，行動有 800 個且 650 個已完成，真正需要控管的是完成行動。',
          '如果某個結果已完成，但它代表一季的重要交付成果，建議保留結果本身；只把底下很舊的完成行動列為封存候選。',
          '如果 JSON 大小接近 5 MB，且已完成行動超過數千筆，可以先匯出完整備份，再考慮未來使用封存功能整理執行流水。',
          '如果一個完成行動同時連到兩個專案，其中一個專案要封存、另一個仍留在主資料，該行動會被保留，避免另一條專案脈絡斷掉。',
          '如果匯入預覽顯示目前本機有 900 個物件、匯入檔案只有 40 個物件，先停下來確認這是不是你真的要恢復的資料，而不是誤選小型測試檔。',
        ],
      },
    ],
  },
  {
    id: 'templates',
    label: '範例與模板',
    articles: [
      {
        id: 'health-example',
        eyebrow: '完整範例',
        title: '從「我想變健康」拆成七層鏈路',
        concept: [
          '「我想變健康」太大，不能直接執行。PPV 會把它拆成價值、方向、成果和下一步。',
        ],
        why: [
          '健康類目標很容易變成短期衝刺。七層鏈路能讓健康回到長期生活能力，而不是只看體重或外表。',
        ],
        practice: [
          '原則：不以長期健康交換短期績效。',
          '支柱：健康。目的：保有陪伴家人與長期工作的身體能力。',
          '目標：建立穩定睡眠與基本體能。結果：連續 30 天 23:30 前上床，並完成 12 次 Zone 2 運動。',
          '專案：設計晚間關機流程、建立每週運動排程。行動：今晚 22:45 關閉工作通知。',
        ],
        mistakes: [
          '直接建立「每天運動」行動，但沒有處理睡眠、時間與家庭節奏。',
          '只用體重當結果，忽略真正想保護的生活能力。',
        ],
        examples: [
          '如果連續失敗，不是責怪自己，而是回到專案層：晚間流程是否設計得太不符合現實？',
        ],
      },
      {
        id: 'finance-example',
        eyebrow: '完整範例',
        title: '從「財務自由」拆成可執行系統',
        concept: [
          '「財務自由」常常太抽象。PPV 會先問它服務什麼目的，再把它轉成可交付成果。',
        ],
        why: [
          '財務目標如果沒有目的，容易變成無止境比較；有目的後，金錢會回到安全、選擇權與家庭承重。',
        ],
        practice: [
          '原則：不讓家庭暴露在可預防的財務脆弱中。',
          '支柱：財務。目的：建立選擇自由與家庭安全邊界。',
          '目標：建立 12 個月緊急預備金。結果：完成家庭現金流表、每月自動投入 20%、保留 6 個月現金。',
          '專案：整理帳戶與固定支出、設定自動轉帳。行動：匯出近三個月銀行明細。',
        ],
        mistakes: [
          '直接追求投資報酬率，卻沒有先處理現金流與風險。',
          '把「研究投資」當成成果，實際上沒有任何可驗收交付物。',
        ],
        examples: [
          '結果可以是「完成家庭資產負債表」，專案是「收集帳戶資料」，行動是「列出所有金融帳戶」。',
        ],
      },
      {
        id: 'setup-template',
        eyebrow: '30 分鐘建立法',
        title: '從零建立 PPV Life OS',
        concept: [
          '第一次建立系統時，不要追求完整。目標是建立一條能用的鏈路，讓系統開始幫你思考。',
        ],
        why: [
          '太完整的第一次設定會讓人卡住。能運作的最小版本，比完美架構更重要。',
        ],
        practice: [
          '5 分鐘：寫下 3 條原則。5 分鐘：列出 5 個支柱。5 分鐘：替最重要支柱寫目的。',
          '10 分鐘：建立 1 個目標、1 個結果、1 個專案。5 分鐘：寫出 3 個下一步行動。',
        ],
        mistakes: [
          '一開始就替所有人生領域建滿物件。',
          '花太多時間命名，卻沒有產生今天能做的行動。',
        ],
        examples: [
          '最小可用版本可以只有一條鏈：原則 -> 健康 -> 保有長期體能 -> 建立睡眠節奏 -> 30 天早睡 -> 晚間流程 -> 今晚 22:45 關通知。',
        ],
      },
      {
        id: 'weekly-review-template',
        eyebrow: '週回顧',
        title: '週回顧 Checklist',
        concept: [
          '週回顧是 PPV 的維修時間。它不是反省大會，而是把系統重新校準到現實。',
        ],
        why: [
          '日常執行會產生偏差。週回顧讓你把完成、延遲、放棄和新承諾整理回系統。',
        ],
        practice: [
          '清空捕捉清單：每個項目決定刪除、行動、專案或結果。',
          '檢查進行中結果：是否仍重要？是否有專案推進？日期是否合理？',
          '檢查行動：完成的標記完成，卡住的拆小，無意義的刪除。',
          '檢查未連結物件：決定連結父層、保留探索或移除。',
        ],
        mistakes: [
          '週回顧只整理清單順序，不檢查對齊。',
          '把所有延期都自動延到下週，沒有重新判斷是否仍值得做。',
        ],
        examples: [
          '固定問題：本週最重要的結果是什麼？哪個專案沒有下一步？哪個行動其實不再重要？',
        ],
      },
      {
        id: 'naming-template',
        eyebrow: '命名規則',
        title: '物件命名範例與反例',
        concept: [
          '命名不是美化，而是讓未來的你一眼知道這個物件在系統中的角色。',
        ],
        why: [
          '模糊名稱會讓週回顧變慢，也會讓你無法判斷物件是否完成。',
        ],
        practice: [
          '原則用判斷句。支柱用領域名。目的用意義句。目標用方向句。結果用交付句。專案用工作範圍。行動用動詞下一步。',
        ],
        mistakes: [
          '所有層級都用同一種名稱，例如全部寫成「健康」。',
          '行動不用動詞，結果沒有完成標準。',
        ],
        examples: [
          '反例：健康。較好：支柱「健康」、目的「保有長期陪伴能力」、結果「完成 30 天睡眠紀錄」。',
          '反例：做財務。較好：行動「匯出 2026-06 信用卡明細」。',
        ],
      },
    ],
  },
]

const firstEncyclopediaArticleId = encyclopediaSections[0].articles[0].id

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
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('month')
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthKey(currentDate()))
  const [calendarLayerFilters, setCalendarLayerFilters] = useState<Record<CalendarLayer, boolean>>(
    () => ({ ...defaultCalendarLayerFilters }),
  )
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<CalendarStatusFilter>('all')
  const [roadmapStartDate, setRoadmapStartDate] = useState(() => getWeekRange(currentDate()).startDate)
  const [roadmapLayerFilters, setRoadmapLayerFilters] = useState<Record<RoadmapLayer, boolean>>(
    () => ({ ...defaultRoadmapLayerFilters }),
  )
  const [roadmapStatusFilter, setRoadmapStatusFilter] = useState<CalendarStatusFilter>('all')
  const [horizonStartMonth, setHorizonStartMonth] = useState(() => getYearStartMonth(currentDate()))
  const [horizonLayerFilters, setHorizonLayerFilters] = useState<Record<HorizonLayer, boolean>>(
    () => ({ ...defaultHorizonLayerFilters }),
  )
  const [horizonStatusFilter, setHorizonStatusFilter] = useState<CalendarStatusFilter>('all')
  const [selectedCalendarItemId, setSelectedCalendarItemId] = useState('')
  const [activeEncyclopediaId, setActiveEncyclopediaId] = useState(firstEncyclopediaArticleId)
  const [pendingImportPreview, setPendingImportPreview] = useState<ImportPreview | null>(null)
  const [importBackupConfirmed, setImportBackupConfirmed] = useState(false)
  const [archivePreview, setArchivePreview] = useState<ArchivePreview | null>(null)
  const [archiveBackupConfirmed, setArchiveBackupConfirmed] = useState(false)
  const [archiveFileExported, setArchiveFileExported] = useState(false)
  const [notice, setNotice] = useState('資料只保存在這台裝置的瀏覽器中。')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, items }))
  }, [items])

  useEffect(() => {
    localStorage.setItem(MAP_PREFERENCES_KEY, JSON.stringify(mapPreferencesByLayer))
  }, [mapPreferencesByLayer])

  const activeLayerMeta = getLayer(activeLayer)
  const activeLayerItems = items.filter((item) => item.layer === activeLayer)
  const activeMapPreference = mapPreferencesByLayer[activeLayer] ?? defaultMapPreference
  const visibleLayerItems = getVisibleLayerItems(activeLayerItems, items, activeMapPreference)
  const pendingActions = getNextActions(items)
  const nextActions = getNextActions(items, NEXT_ACTION_LIMIT)
  const activeProjects = items.filter((item) => item.layer === 'project' && item.status !== 'done')
  const activeOutcomes = items.filter((item) => item.layer === 'outcome' && item.status === 'active')
  const featuredOutcomes = getFeaturedOutcomes(activeOutcomes)
  const unlinkedItems = items.filter((item) => getLayer(item.layer).parent && item.parentIds.length === 0)
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null
  const calendarEntries = getCalendarRangeEntries(
    items,
    calendarLayerFilters,
    calendarMonth,
    calendarStatusFilter,
  )
  const roadmapRange = getRollingRange(roadmapStartDate, 13 * 7 - 1)
  const roadmapEntries = getTimelineRangeEntries(
    items,
    roadmapLayerFilters,
    roadmapLayerIds,
    roadmapRange.startDate,
    roadmapRange.endDate,
    roadmapStatusFilter,
  )
  const roadmapUnscheduledItems = getUnscheduledTimelineItems(
    items,
    roadmapLayerFilters,
    roadmapLayerIds,
    roadmapStatusFilter,
  )
  const horizonRange = getHorizonRange(horizonStartMonth)
  const horizonEntries = getTimelineRangeEntries(
    items,
    horizonLayerFilters,
    horizonLayerIds,
    horizonRange.startDate,
    horizonRange.endDate,
    horizonStatusFilter,
  )
  const horizonUnscheduledItems = getUnscheduledTimelineItems(
    items,
    horizonLayerFilters,
    horizonLayerIds,
    horizonStatusFilter,
  )
  const activeCalendarEntries =
    calendarViewMode === 'month'
      ? calendarEntries
      : calendarViewMode === 'quarter'
        ? roadmapEntries
        : horizonEntries
  const selectedCalendarEntry =
    activeCalendarEntries.find((entry) => entry.item.id === selectedCalendarItemId) ?? null

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

  function startCreate(layer: LayerId = activeLayer, parentIds: string[] = []) {
    const nextDraft = emptyDraft(layer)

    setEditingId(null)
    setDraft({
      ...nextDraft,
      parentIds: getLayer(layer).parent ? parentIds : [],
    })
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
      dueDate: item.dueDate,
      deadlineDate: item.deadlineDate,
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

  function changeCalendarViewMode(mode: CalendarViewMode) {
    setCalendarViewMode(mode)
    setSelectedCalendarItemId('')
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

  function showPreviousRoadmapRange() {
    setRoadmapStartDate((current) => addDays(current, -13 * 7))
  }

  function showNextRoadmapRange() {
    setRoadmapStartDate((current) => addDays(current, 13 * 7))
  }

  function showCurrentRoadmapRange() {
    setRoadmapStartDate(getWeekRange(currentDate()).startDate)
  }

  function showPreviousHorizonRange() {
    setHorizonStartMonth((current) => shiftMonth(current, -12))
  }

  function showNextHorizonRange() {
    setHorizonStartMonth((current) => shiftMonth(current, 12))
  }

  function showCurrentHorizonRange() {
    setHorizonStartMonth(getYearStartMonth(currentDate()))
  }

  function toggleCalendarLayer(layer: CalendarLayer) {
    setCalendarLayerFilters((current) => ({
      ...current,
      [layer]: !current[layer],
    }))
  }

  function toggleRoadmapLayer(layer: RoadmapLayer) {
    setRoadmapLayerFilters((current) => ({
      ...current,
      [layer]: !current[layer],
    }))
  }

  function toggleHorizonLayer(layer: HorizonLayer) {
    setHorizonLayerFilters((current) => ({
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
      version: 3,
      exportedAt: new Date().toISOString(),
      items,
    }
    downloadJsonFile(payload, `ppv-lifeos-${currentDate()}.json`)
    setNotice('已匯出 JSON，可存到 iPhone「檔案」。')
  }

  function exportCurrentBeforeImport() {
    exportJson()
    setImportBackupConfirmed(true)
    setNotice('已匯出目前資料備份，可以確認取代匯入。')
  }

  function resetImportPreview() {
    setPendingImportPreview(null)
    setImportBackupConfirmed(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function confirmImportReplace() {
    if (!pendingImportPreview || !importBackupConfirmed || pendingImportPreview.validItemCount === 0) return

    setItems(pendingImportPreview.validItems)
    setEditingId(null)
    setSelectedItemId('')
    setDraft(emptyDraft(activeLayer))
    setPanelMode('create')
    setNotice(`已取代目前資料，匯入 ${pendingImportPreview.validItemCount} 個有效物件。`)
    resetArchivePreview()
    resetImportPreview()
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = analyzeImportFile(String(reader.result), file.name, file.size)
        setPendingImportPreview(result.preview)
        setImportBackupConfirmed(false)
        setNotice('已建立匯入前預覽，尚未取代目前資料。')
      } catch {
        setNotice('匯入失敗，請確認檔案是 PPV Life OS JSON。')
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  function createArchivePreview(mode: ArchiveMode) {
    const preview = buildArchivePreview(items, mode)
    setArchivePreview(preview)
    setArchiveBackupConfirmed(false)
    setArchiveFileExported(false)
    setNotice(
      preview.items.length > 0
        ? `已建立封存預覽：${archiveModeLabels[mode]}。`
        : `目前沒有符合條件的${archiveModeLabels[mode]}封存候選。`,
    )
  }

  function exportFullBackupBeforeArchive() {
    exportJson()
    setArchiveBackupConfirmed(true)
    setNotice('已匯出完整備份，可以繼續匯出封存檔。')
  }

  function exportArchiveFile() {
    if (!archivePreview || !archiveBackupConfirmed || archivePreview.items.length === 0) return

    exportArchiveJson(archivePreview)
    setArchiveFileExported(true)
    setNotice(`已匯出封存檔：${archiveModeLabels[archivePreview.mode]}。`)
  }

  function resetArchivePreview() {
    setArchivePreview(null)
    setArchiveBackupConfirmed(false)
    setArchiveFileExported(false)
  }

  function confirmRemoveArchivedItems() {
    if (
      !archivePreview ||
      !archiveBackupConfirmed ||
      !archiveFileExported ||
      archivePreview.items.length === 0
    ) {
      return
    }

    const archivedIds = new Set(archivePreview.itemIds)
    const removedCount = archivePreview.items.length
    setItems((current) => removeArchivedItems(current, archivePreview))

    if (selectedItemId && archivedIds.has(selectedItemId)) {
      setSelectedItemId('')
      setPanelMode('create')
    }

    if (editingId && archivedIds.has(editingId)) {
      setEditingId(null)
      setDraft(emptyDraft(activeLayer))
      setPanelMode('create')
    }

    if (selectedCalendarItemId && archivedIds.has(selectedCalendarItemId)) {
      setSelectedCalendarItemId('')
    }

    setNotice(`已從主資料移除 ${removedCount} 個封存物件。`)
    resetArchivePreview()
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
                <h2>{nextActions[0]?.title ?? '先建立你的第一個行動'}</h2>
                {nextActions[0]?.note && <p>{nextActions[0].note}</p>}
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

            <ReviewAlignmentCenter
              items={items}
              onCreateAction={(project) => startCreate('action', [project.id])}
              onCreateProject={(outcome) => startCreate('project', [outcome.id])}
              onEditItem={startEdit}
              onOpenItem={openItemRelationship}
              onToggleActionDone={(item) => updateStatus(item, item.status === 'done' ? 'active' : 'done')}
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
              <div className="next-action-heading-actions">
                <span className="count-pill">
                  {nextActions.length} / {pendingActions.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    startCreate('action')
                  }}
                >
                  新增行動
                </button>
              </div>
            </div>
            <div className="action-list">
              {nextActions.map((item) => (
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
              {pendingActions.length === 0 && <EmptyState label="目前沒有未完成行動" />}
            </div>
            {pendingActions.length > nextActions.length && (
              <p className="next-action-note">
                已顯示最需要處理的 {nextActions.length} 個行動，其餘行動可在專案管理中查看。
              </p>
            )}

            <ProjectManagementPanel
              items={items}
              onCreateAction={(project) => startCreate('action', [project.id])}
              onEditAction={startEdit}
              onOpenItem={openItemRelationship}
              onToggleActionDone={(item) => updateStatus(item, item.status === 'done' ? 'active' : 'done')}
            />
          </section>
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            allItems={items}
            entries={calendarEntries}
            horizonEntries={horizonEntries}
            horizonLayerFilters={horizonLayerFilters}
            horizonRange={horizonRange}
            horizonStatusFilter={horizonStatusFilter}
            horizonUnscheduledItems={horizonUnscheduledItems}
            layerFilters={calendarLayerFilters}
            month={calendarMonth}
            roadmapEntries={roadmapEntries}
            roadmapLayerFilters={roadmapLayerFilters}
            roadmapRange={roadmapRange}
            roadmapStatusFilter={roadmapStatusFilter}
            roadmapUnscheduledItems={roadmapUnscheduledItems}
            selectedEntry={selectedCalendarEntry}
            statusFilter={calendarStatusFilter}
            viewMode={calendarViewMode}
            onCloseDetail={() => setSelectedCalendarItemId('')}
            onEditItem={startEdit}
            onHorizonLayerToggle={toggleHorizonLayer}
            onHorizonStatusFilterChange={setHorizonStatusFilter}
            onLayerToggle={toggleCalendarLayer}
            onNextMonth={showNextCalendarMonth}
            onNextHorizon={showNextHorizonRange}
            onNextRoadmap={showNextRoadmapRange}
            onOpenItem={openItemRelationship}
            onPreviousMonth={showPreviousCalendarMonth}
            onPreviousHorizon={showPreviousHorizonRange}
            onPreviousRoadmap={showPreviousRoadmapRange}
            onRoadmapLayerToggle={toggleRoadmapLayer}
            onRoadmapStatusFilterChange={setRoadmapStatusFilter}
            onSelectItem={(item) => setSelectedCalendarItemId(item.id)}
            onStatusFilterChange={setCalendarStatusFilter}
            onTodayHorizon={showCurrentHorizonRange}
            onToday={showCurrentCalendarMonth}
            onTodayRoadmap={showCurrentRoadmapRange}
            onToggleActionDone={(item) => updateStatus(item, item.status === 'done' ? 'active' : 'done')}
            onViewModeChange={changeCalendarViewMode}
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

            {pendingImportPreview && (
              <ImportPreviewPanel
                backupConfirmed={importBackupConfirmed}
                currentSummary={getDataSummary(items)}
                preview={pendingImportPreview}
                onBackup={exportCurrentBeforeImport}
                onCancel={resetImportPreview}
                onConfirm={confirmImportReplace}
              />
            )}

            <PpvEncyclopedia
              activeArticleId={activeEncyclopediaId}
              onArticleChange={setActiveEncyclopediaId}
            />

            <DataStatusPanel items={items} onPreviewArchive={createArchivePreview} />

            {archivePreview && (
              <ArchivePreviewPanel
                backupConfirmed={archiveBackupConfirmed}
                fileExported={archiveFileExported}
                preview={archivePreview}
                onBackup={exportFullBackupBeforeArchive}
                onCancel={resetArchivePreview}
                onExportArchive={exportArchiveFile}
                onRemove={confirmRemoveArchivedItems}
              />
            )}
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
  const [parentSearchText, setParentSearchText] = useState('')
  const [parentStatusView, setParentStatusView] = useState<ParentStatusView>('open')
  const visibleParentOptions = getParentOptions(
    parentOptions,
    draft.parentIds,
    parentSearchText,
    parentStatusView,
  )

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
              <div className="parent-picker-controls">
                <label>
                  搜尋上層
                  <input
                    value={parentSearchText}
                    placeholder="名稱或說明"
                    onChange={(event) => setParentSearchText(event.target.value)}
                  />
                </label>
                <div className="parent-status-toggle" aria-label="篩選上層狀態">
                  {[
                    ['open', '未完成'],
                    ['all', '全部'],
                    ['done', '已完成'],
                  ].map(([value, label]) => (
                    <button
                      className={parentStatusView === value ? 'active' : ''}
                      type="button"
                      key={value}
                      onClick={() => setParentStatusView(value as ParentStatusView)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="parent-options">
                {visibleParentOptions.length > 0 ? (
                  visibleParentOptions.map((item) => {
                    const selected = draft.parentIds.includes(item.id)

                    return (
                      <label className={selected ? 'check-option selected' : 'check-option'} key={item.id}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleParent(item.id)}
                        />
                        <span>
                          <strong>{item.title}</strong>
                          <small>
                            {statusLabels[item.status]}
                            {dateSummary(item) ? ` · ${dateSummary(item)}` : ''}
                            {selected ? ' · 已選取' : ''}
                          </small>
                        </span>
                      </label>
                    )
                  })
                ) : (
                  <EmptyState label="沒有符合目前條件的上層物件" />
                )}
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

function ReviewAlignmentCenter({
  items,
  onCreateAction,
  onCreateProject,
  onEditItem,
  onOpenItem,
  onToggleActionDone,
}: {
  items: LifeItem[]
  onCreateAction: (project: LifeItem) => void
  onCreateProject: (outcome: LifeItem) => void
  onEditItem: (item: LifeItem) => void
  onOpenItem: (item: LifeItem) => void
  onToggleActionDone: (item: LifeItem) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [granularity, setGranularity] = useState<ReviewGranularity>('week')
  const [anchorDate, setAnchorDate] = useState(currentDate())
  const [selectedMetricId, setSelectedMetricId] = useState('')
  const [selectedIssueKind, setSelectedIssueKind] = useState<AlignmentIssueKind | 'all'>('all')
  const range = getReviewRange(granularity, anchorDate)
  const currentRange = getReviewRange(granularity, currentDate())
  const reviewData = getReviewData(items, granularity, range)
  const issues = getAlignmentIssues(items)
  const issueGroups = getAlignmentIssueGroups(issues)
  const selectedMetric =
    reviewData.metrics.find((metric) => metric.id === selectedMetricId) ??
    reviewData.metrics[0] ??
    { id: 'empty', label: '回顧項目', items: [] }
  const selectedIssues =
    selectedIssueKind === 'all' ? issues : issues.filter((issue) => issue.kind === selectedIssueKind)
  const canGoNext = range.startDate < currentRange.startDate

  function changeGranularity(nextGranularity: ReviewGranularity) {
    setGranularity(nextGranularity)
    setAnchorDate(currentDate())
    setSelectedMetricId('')
    setSelectedIssueKind('all')
  }

  function shiftReview(direction: -1 | 1) {
    if (direction === 1 && !canGoNext) return
    setAnchorDate((current) => shiftReviewAnchor(granularity, current, direction))
    setSelectedMetricId('')
    setSelectedIssueKind('all')
  }

  function returnToCurrentRange() {
    setAnchorDate(currentDate())
    setSelectedMetricId('')
    setSelectedIssueKind('all')
  }

  return (
    <section className="section-block weekly-alignment">
      <div className="section-heading">
        <div>
          <p className="eyebrow">回顧與對齊</p>
          <h2>{reviewGranularityNames[granularity]}與對齊檢查</h2>
        </div>
        <span className="count-pill">
          {range.startDate} - {range.endDate}
        </span>
      </div>

      <div className="review-toolbar">
        <div className="review-granularity-switch" aria-label="選擇回顧顆粒">
          {reviewGranularityIds.map((id) => (
            <button
              className={id === granularity ? 'active' : ''}
              type="button"
              key={id}
              onClick={() => changeGranularity(id)}
            >
              {reviewGranularityLabels[id]}
            </button>
          ))}
        </div>

        <div className="review-period-nav" aria-label="切換回顧期間">
          <button type="button" onClick={() => shiftReview(-1)}>
            上一期
          </button>
          <button className="ghost-button" type="button" onClick={returnToCurrentRange}>
            回到本期
          </button>
          <button type="button" onClick={() => shiftReview(1)} disabled={!canGoNext}>
            下一期
          </button>
        </div>
      </div>

      <div className="weekly-summary-grid">
        {reviewData.summaries.map((summary) => (
          <SummaryPill
            label={summary.label}
            value={summary.value}
            tone={summary.tone}
            key={summary.label}
          />
        ))}
      </div>

      <div className="weekly-intro">
        <p className="muted">{reviewData.intro}</p>
        <button type="button" onClick={() => setExpanded((current) => !current)}>
          {expanded ? `收合${reviewGranularityNames[granularity]}` : `開始${reviewGranularityNames[granularity]}`}
        </button>
      </div>

      {expanded && (
        <div className="weekly-review-body">
          <div className="weekly-metric-grid" aria-label={`${reviewGranularityNames[granularity]}總覽`}>
            {reviewData.metrics.map((metric) => (
              <button
                className={metric.id === selectedMetricId ? 'weekly-metric active' : 'weekly-metric'}
                type="button"
                key={metric.id}
                onClick={() => setSelectedMetricId(metric.id)}
              >
                <strong>{metric.items.length}</strong>
                <span>{metric.label}</span>
              </button>
            ))}
          </div>

          <div className="weekly-detail-panel">
            <div className="weekly-panel-heading">
              <div>
                <p className="eyebrow">{range.label}</p>
                <h3>{selectedMetric.label}</h3>
              </div>
              <span className="count-pill">{selectedMetric.items.length} 個</span>
            </div>
            <WeeklyItemList
              items={selectedMetric.items}
              allItems={items}
              onEditItem={onEditItem}
              onOpenItem={onOpenItem}
              onToggleActionDone={onToggleActionDone}
            />
          </div>

          {granularity === 'week' ? (
            <div className="weekly-detail-panel">
              <div className="weekly-panel-heading">
                <div>
                  <p className="eyebrow">Alignment</p>
                  <h3>對齊斷點</h3>
                </div>
                <span className="count-pill">{issues.length} 個</span>
              </div>

              <div className="issue-filter-row" aria-label="對齊斷點分類">
                <button
                  className={selectedIssueKind === 'all' ? 'active' : ''}
                  type="button"
                  onClick={() => setSelectedIssueKind('all')}
                >
                  全部 {issues.length}
                </button>
                {issueGroups.map((group) => (
                  <button
                    className={selectedIssueKind === group.kind ? 'active' : ''}
                    type="button"
                    key={group.kind}
                    onClick={() => setSelectedIssueKind(group.kind)}
                  >
                    {group.label} {group.count}
                  </button>
                ))}
              </div>

              <div className="issue-list">
                {selectedIssues.length > 0 ? (
                  selectedIssues.map((issue) => (
                    <article className="issue-row" key={`${issue.kind}-${issue.item.id}`}>
                      <span className={`severity-pill ${issue.severity}`}>{severityLabels[issue.severity]}</span>
                      <div>
                        <strong>{issue.title}</strong>
                        <p>{issue.description}</p>
                        <small>{itemMeta(issue.item)}</small>
                      </div>
                      <div className="issue-actions">
                        {issue.createAction && issue.createAction.layer === 'project' && (
                          <button type="button" onClick={() => onCreateProject(issue.item)}>
                            {issue.createAction.label}
                          </button>
                        )}
                        {issue.createAction && issue.createAction.layer === 'action' && (
                          <button type="button" onClick={() => onCreateAction(issue.item)}>
                            {issue.createAction.label}
                          </button>
                        )}
                        <button className="ghost-button" type="button" onClick={() => onOpenItem(issue.item)}>
                          查看關係
                        </button>
                        <button className="ghost-button" type="button" onClick={() => onEditItem(issue.item)}>
                          編輯
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState label="目前沒有符合這個分類的對齊斷點" />
                )}
              </div>
            </div>
          ) : (
            <ReviewSectionList
              allItems={items}
              sections={reviewData.sections}
              onEditItem={onEditItem}
              onOpenItem={onOpenItem}
            />
          )}
        </div>
      )}
    </section>
  )
}

function SummaryPill({
  label,
  tone,
  value,
}: {
  label: string
  tone: AlignmentSeverity
  value: number
}) {
  return (
    <div className={`summary-pill ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function WeeklyItemList({
  allItems,
  emptyLabel = '目前沒有符合這個總覽項目的物件',
  showActionToggle = true,
  items,
  onEditItem,
  onOpenItem,
  onToggleActionDone,
}: {
  allItems: LifeItem[]
  emptyLabel?: string
  showActionToggle?: boolean
  items: LifeItem[]
  onEditItem: (item: LifeItem) => void
  onOpenItem: (item: LifeItem) => void
  onToggleActionDone: (item: LifeItem) => void
}) {
  if (items.length === 0) return <EmptyState label={emptyLabel} />

  return (
    <div className="weekly-item-list">
      {items.map((item) => (
        <article className="weekly-item-row" key={item.id}>
          <span className={`node-badge layer-${item.layer}`}>{getLayer(item.layer).short}</span>
          <button className="weekly-item-main" type="button" onClick={() => onOpenItem(item)}>
            <strong>{item.title}</strong>
            <span>{statusLabels[item.status]}</span>
            <small>
              {dateSummary(item) || `建立 ${item.createdDate}`} · {connectionSummary(item, allItems)}
            </small>
          </button>
          <div className="weekly-item-actions">
            {showActionToggle && item.layer === 'action' && (
              <button
                className={item.status === 'done' ? 'check done' : 'check'}
                type="button"
                onClick={() => onToggleActionDone(item)}
                aria-label={`切換完成：${item.title}`}
              >
                ✓
              </button>
            )}
            <button className="ghost-button" type="button" onClick={() => onEditItem(item)}>
              編輯
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

function ReviewSectionList({
  allItems,
  sections,
  onEditItem,
  onOpenItem,
}: {
  allItems: LifeItem[]
  sections: ReviewSection[]
  onEditItem: (item: LifeItem) => void
  onOpenItem: (item: LifeItem) => void
}) {
  return (
    <div className="review-section-list">
      {sections.map((section) => (
        <div className="weekly-detail-panel review-section" key={section.id}>
          <div className="weekly-panel-heading">
            <div>
              <p className="eyebrow">{section.eyebrow}</p>
              <h3>{section.title}</h3>
            </div>
            <span className="count-pill">{section.items.length} 個</span>
          </div>
          <WeeklyItemList
            items={section.items}
            allItems={allItems}
            onEditItem={onEditItem}
            onOpenItem={onOpenItem}
            onToggleActionDone={() => undefined}
            emptyLabel={section.emptyLabel}
            showActionToggle={false}
          />
        </div>
      ))}
    </div>
  )
}

function ProjectManagementPanel({
  items,
  onCreateAction,
  onEditAction,
  onOpenItem,
  onToggleActionDone,
}: {
  items: LifeItem[]
  onCreateAction: (project: LifeItem) => void
  onEditAction: (item: LifeItem) => void
  onOpenItem: (item: LifeItem) => void
  onToggleActionDone: (item: LifeItem) => void
}) {
  const [collapsedOutcomeIds, setCollapsedOutcomeIds] = useState<string[]>([])
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<string[]>([])
  const [showAllActionProjectIds, setShowAllActionProjectIds] = useState<string[]>([])
  const branches = getProjectManagementBranches(items)
  const projectCount = branches.reduce((total, branch) => total + branch.projects.length, 0)
  const activeActionCount = branches.reduce(
    (total, branch) =>
      total +
      branch.projects.reduce(
        (projectTotal, projectNode) =>
          projectTotal + projectNode.actions.filter((item) => item.status === 'active').length,
        0,
      ),
    0,
  )

  function toggleOutcome(outcomeId: string) {
    setCollapsedOutcomeIds((current) => toggleListValue(current, outcomeId))
  }

  function toggleProject(projectId: string) {
    setCollapsedProjectIds((current) => toggleListValue(current, projectId))
  }

  function toggleActionStatusView(projectId: string) {
    setShowAllActionProjectIds((current) => toggleListValue(current, projectId))
  }

  return (
    <section className="section-block project-management">
      <div className="section-heading">
        <div>
          <p className="eyebrow">專案管理</p>
          <h2>結果到行動</h2>
        </div>
        <span className="count-pill">
          {branches.length} 結果 / {projectCount} 專案 / {activeActionCount} 行動
        </span>
      </div>

      {branches.length > 0 ? (
        <div className="pm-tree">
          {branches.map((branch) => {
            const outcomeOpen = !collapsedOutcomeIds.includes(branch.outcome.id)

            return (
              <article className="pm-outcome-group" key={branch.outcome.id}>
                <button
                  className="pm-outcome-banner"
                  type="button"
                  aria-expanded={outcomeOpen}
                  onClick={() => toggleOutcome(branch.outcome.id)}
                >
                  <span className="pm-disclosure" aria-hidden="true">
                    {outcomeOpen ? '-' : '+'}
                  </span>
                  <div className="pm-banner-main">
                    <span className="node-badge layer-outcome">{getLayer(branch.outcome.layer).short}</span>
                    <div>
                      <strong>{branch.outcome.title}</strong>
                      <small>{branch.outcome.note || connectionSummary(branch.outcome, items)}</small>
                    </div>
                  </div>
                  <DateCountdown item={branch.outcome} />
                </button>

                {outcomeOpen && (
                  <div className="pm-project-list">
                    {branch.projects.length > 0 ? (
                      branch.projects.map((projectNode) => {
                        const projectOpen = !collapsedProjectIds.includes(projectNode.project.id)
                        const showAllActions = showAllActionProjectIds.includes(projectNode.project.id)
                        const visibleActions = showAllActions
                          ? projectNode.actions
                          : projectNode.actions.filter((item) => item.status === 'active')

                        return (
                          <article className="pm-project-group" key={projectNode.project.id}>
                            <div className="pm-project-banner">
                              <button
                                className="pm-project-toggle"
                                type="button"
                                aria-expanded={projectOpen}
                                onClick={() => toggleProject(projectNode.project.id)}
                              >
                                <span className="pm-disclosure" aria-hidden="true">
                                  {projectOpen ? '-' : '+'}
                                </span>
                                <div className="pm-banner-main">
                                  <span className="node-badge layer-project">
                                    {getLayer(projectNode.project.layer).short}
                                  </span>
                                  <div>
                                    <strong>{projectNode.project.title}</strong>
                                    <small>
                                      {projectNode.project.note ||
                                        `${projectNode.actions.length} 個行動連結`}
                                    </small>
                                  </div>
                                </div>
                                <DateCountdown item={projectNode.project} />
                              </button>
                              <div className="pm-project-controls">
                                <button
                                  className="ghost-button"
                                  type="button"
                                  onClick={() => onCreateAction(projectNode.project)}
                                >
                                  新增行動
                                </button>
                                {projectNode.actions.length > 0 && (
                                  <button
                                    className="ghost-button"
                                    type="button"
                                    onClick={() => toggleActionStatusView(projectNode.project.id)}
                                  >
                                    {showAllActions ? '只看進行中' : '顯示全部行動'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {projectOpen && (
                              <div className="pm-action-list">
                                {visibleActions.length > 0 ? (
                                  visibleActions.map((action) => (
                                    <article className={`pm-action-row status-${action.status}`} key={action.id}>
                                      <button
                                        className={action.status === 'done' ? 'check done' : 'check'}
                                        type="button"
                                        onClick={() => onToggleActionDone(action)}
                                        aria-label={`切換完成：${action.title}`}
                                      >
                                        ✓
                                      </button>
                                      <button
                                        className="pm-action-content"
                                        type="button"
                                        onClick={() => onOpenItem(action)}
                                      >
                                        <strong>{action.title}</strong>
                                        <span>{action.note || connectionSummary(action, items)}</span>
                                        <small>
                                          {statusLabels[action.status]} · {formatDueDateLabel(action)} ·{' '}
                                          {dueCountdownText(action)}
                                        </small>
                                      </button>
                                      <button
                                        className="ghost-button"
                                        type="button"
                                        onClick={() => onEditAction(action)}
                                      >
                                        編輯
                                      </button>
                                    </article>
                                  ))
                                ) : (
                                  <div className="pm-action-empty">
                                    <EmptyState
                                      label={
                                        projectNode.actions.length === 0
                                          ? '這個專案尚未建立行動'
                                          : '目前沒有進行中的行動'
                                      }
                                    />
                                    <button type="button" onClick={() => onCreateAction(projectNode.project)}>
                                      新增行動
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                        )
                      })
                    ) : (
                      <EmptyState label="這個結果目前沒有進行中的專案" />
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState label="目前沒有進行中的結果可管理" />
      )}
    </section>
  )
}

function DateCountdown({ item }: { item: LifeItem }) {
  return (
    <div className="pm-date-summary">
      <span>{formatDueDateLabel(item)}</span>
      <span className={`pm-countdown ${dueCountdownTone(item)}`}>{dueCountdownText(item)}</span>
    </div>
  )
}

function PpvEncyclopedia({
  activeArticleId,
  onArticleChange,
}: {
  activeArticleId: string
  onArticleChange: (articleId: string) => void
}) {
  const activeArticle = findEncyclopediaArticle(activeArticleId)

  return (
    <section className="section-block encyclopedia">
      <div className="section-heading encyclopedia-heading">
        <div>
          <p className="eyebrow">PPV Life OS 百科全書</p>
          <h2>從理論到實作</h2>
        </div>
        <span className="count-pill">
          {encyclopediaSections.reduce((total, section) => total + section.articles.length, 0)} 篇
        </span>
      </div>

      <div className="encyclopedia-layout">
        <nav className="encyclopedia-tabs" aria-label="百科全書章節">
          {encyclopediaSections.map((section) => (
            <div className="encyclopedia-tab-group" key={section.id}>
              <p>{section.label}</p>
              <div>
                {section.articles.map((article) => (
                  <button
                    className={article.id === activeArticle.id ? 'active' : ''}
                    type="button"
                    key={article.id}
                    onClick={() => onArticleChange(article.id)}
                  >
                    {article.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <article className="encyclopedia-article">
          <p className="eyebrow">{activeArticle.eyebrow}</p>
          <h3>{activeArticle.title}</h3>
          <EncyclopediaArticlePart title="核心概念" items={activeArticle.concept} />
          <EncyclopediaArticlePart title="為什麼重要" items={activeArticle.why} />
          <EncyclopediaArticlePart title="如何實作" items={activeArticle.practice} ordered />
          <EncyclopediaArticlePart title="常見錯誤" items={activeArticle.mistakes} />
          <EncyclopediaArticlePart title="實作提示或範例" items={activeArticle.examples} accent />
        </article>
      </div>
    </section>
  )
}

function EncyclopediaArticlePart({
  accent = false,
  items,
  ordered = false,
  title,
}: {
  accent?: boolean
  items: string[]
  ordered?: boolean
  title: string
}) {
  const ListTag = ordered ? 'ol' : 'ul'

  return (
    <section className={accent ? 'encyclopedia-part example' : 'encyclopedia-part'}>
      <h4>{title}</h4>
      <ListTag>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ListTag>
    </section>
  )
}

function DataStatusPanel({
  items,
  onPreviewArchive,
}: {
  items: LifeItem[]
  onPreviewArchive: (mode: ArchiveMode) => void
}) {
  const status = getDataStatus(items)

  return (
    <section className="section-block data-status-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">資料狀態</p>
          <h2>本機資料概況</h2>
        </div>
        <span className="count-pill">{formatCount(status.totalCount)} 個物件</span>
      </div>

      <div className="data-status-summary">
        <DataStatusCard label="總物件" value={formatCount(status.totalCount)} />
        <DataStatusCard label="JSON 估算大小" value={formatBytes(status.estimatedJsonBytes)} />
        <DataStatusCard label="資料格式" value="v3" />
      </div>

      <div className="data-status-groups">
        <section className="data-status-group">
          <div className="data-status-group-heading">
            <h3>核心層資料</h3>
            <span>{formatCount(coreLayerIds.reduce((total, layer) => total + status.coreCounts[layer], 0))}</span>
          </div>
          <div className="data-layer-counts">
            {coreLayerIds.map((layerId) => (
              <DataStatusRow
                key={layerId}
                label={getLayer(layerId).label}
                value={formatCount(status.coreCounts[layerId])}
              />
            ))}
          </div>
        </section>

        <section className="data-status-group">
          <div className="data-status-group-heading">
            <h3>執行層資料</h3>
            <span>{formatCount(status.project.total + status.action.total)}</span>
          </div>
          <div className="execution-status-grid">
            <ExecutionStatusCard label="專案" summary={status.project} />
            <ExecutionStatusCard label="行動" summary={status.action} />
          </div>
        </section>

        <section className="data-status-group archive-status-group">
          <div className="data-status-group-heading">
            <h3>封存候選</h3>
            <span>
              {formatCount(status.archiveCandidates.actions + status.archiveCandidates.projects)}
            </span>
          </div>
          <div className="archive-candidate-grid">
            <DataStatusCard label="可封存行動" value={formatCount(status.archiveCandidates.actions)} />
            <DataStatusCard label="可封存專案" value={formatCount(status.archiveCandidates.projects)} />
          </div>
          <div className="archive-preview-controls">
            <button type="button" onClick={() => onPreviewArchive('actions')}>
              預覽完成行動
            </button>
            <button className="ghost-button" type="button" onClick={() => onPreviewArchive('projects-actions')}>
              預覽專案與行動
            </button>
          </div>
        </section>
      </div>
    </section>
  )
}

function ImportPreviewPanel({
  backupConfirmed,
  currentSummary,
  preview,
  onBackup,
  onCancel,
  onConfirm,
}: {
  backupConfirmed: boolean
  currentSummary: DataSummary
  preview: ImportPreview
  onBackup: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const canConfirm = backupConfirmed && preview.validItemCount > 0

  return (
    <section className="section-block import-preview-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">匯入前預覽</p>
          <h2>確認取代本機資料</h2>
        </div>
        <span className="count-pill">{preview.validItemCount} 個有效物件</span>
      </div>

      <div className="import-file-meta">
        <ImportMeta label="檔案" value={preview.fileName} />
        <ImportMeta label="大小" value={formatFileSize(preview.fileSize)} />
        <ImportMeta label="匯出時間" value={preview.exportedAt || '未提供'} />
        <ImportMeta label="資料版本" value={preview.version} />
      </div>

      <div className="import-summary-compare">
        <DataSummaryCard title="目前本機資料" summary={currentSummary} />
        <DataSummaryCard title="匯入檔案" summary={preview.summary} />
      </div>

      <div className="import-validity-grid">
        <DataStatusCard label="檔案物件總數" value={formatCount(preview.totalItemCount)} />
        <DataStatusCard label="有效物件" value={formatCount(preview.validItemCount)} />
        <DataStatusCard label="無效物件" value={formatCount(preview.invalidItemCount)} />
      </div>

      <p className="import-warning">
        此操作會取代目前本機資料，不是合併。不符合目前 LifeItem v3 格式的物件會被忽略。
      </p>

      <div className="import-preview-actions">
        <button type="button" onClick={onBackup}>
          先匯出目前資料
        </button>
        <button className="ghost-button" type="button" onClick={onCancel}>
          取消
        </button>
        <button className="danger-button" type="button" onClick={onConfirm} disabled={!canConfirm}>
          取代目前資料
        </button>
      </div>

      {!backupConfirmed && (
        <p className="import-backup-note">請先匯出目前資料備份，才可確認取代。</p>
      )}
      {preview.validItemCount === 0 && (
        <p className="import-backup-note">此檔案沒有可匯入的有效物件。</p>
      )}
    </section>
  )
}

function ArchivePreviewPanel({
  backupConfirmed,
  fileExported,
  preview,
  onBackup,
  onCancel,
  onExportArchive,
  onRemove,
}: {
  backupConfirmed: boolean
  fileExported: boolean
  preview: ArchivePreview
  onBackup: () => void
  onCancel: () => void
  onExportArchive: () => void
  onRemove: () => void
}) {
  const hasItems = preview.items.length > 0
  const canExportArchive = backupConfirmed && hasItems
  const canRemove = backupConfirmed && fileExported && hasItems

  return (
    <section className="section-block import-preview-panel archive-preview-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">封存匯出預覽</p>
          <h2>{archiveModeLabels[preview.mode]}</h2>
        </div>
        <span className="count-pill">{formatCount(preview.items.length)} 個候選物件</span>
      </div>

      <div className="import-validity-grid archive-impact-grid">
        <DataStatusCard label="將移除專案" value={formatCount(preview.impact.projectCount)} />
        <DataStatusCard label="將移除行動" value={formatCount(preview.impact.actionCount)} />
        <DataStatusCard label="JSON 估算減少" value={formatBytes(preview.impact.estimatedBytesReduction)} />
      </div>

      <div className="import-summary-compare">
        <div className="data-summary-card">
          <h3>仍留在主資料的脈絡</h3>
          <div className="data-summary-grid">
            <DataStatusRow label="支柱" value={formatCount(preview.impact.retainedPillars)} />
            <DataStatusRow label="目標" value={formatCount(preview.impact.retainedGoals)} />
            <DataStatusRow label="結果" value={formatCount(preview.impact.retainedOutcomes)} />
          </div>
        </div>
        <div className="data-summary-card">
          <h3>保護規則</h3>
          <div className="data-summary-grid">
            <DataStatusRow
              label="多父層行動保留"
              value={formatCount(preview.impact.protectedActionCount)}
            />
            <DataStatusRow label="封存前大小" value={formatBytes(preview.impact.estimatedBytesBefore)} />
            <DataStatusRow label="封存後大小" value={formatBytes(preview.impact.estimatedBytesAfter)} />
          </div>
        </div>
      </div>

      <p className="import-warning">
        封存會先匯出歷史流水，再從主資料移除候選物件。結果、目標、支柱與更上層資料會保留在主資料中；保留的多父層行動會移除指向封存專案的父層連結。
      </p>

      <div className="import-preview-actions archive-preview-actions">
        <button type="button" onClick={onBackup}>
          匯出完整備份
        </button>
        <button type="button" onClick={onExportArchive} disabled={!canExportArchive}>
          匯出封存檔
        </button>
        <button className="ghost-button" type="button" onClick={onCancel}>
          取消
        </button>
        <button className="danger-button" type="button" onClick={onRemove} disabled={!canRemove}>
          從主資料移除封存物件
        </button>
      </div>

      {!hasItems && <p className="import-backup-note">目前沒有符合條件的封存候選。</p>}
      {hasItems && !backupConfirmed && (
        <p className="import-backup-note">請先匯出完整備份，再匯出封存檔。</p>
      )}
      {hasItems && backupConfirmed && !fileExported && (
        <p className="import-backup-note">請先匯出封存檔，才可從主資料移除候選物件。</p>
      )}
    </section>
  )
}

function ImportMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="import-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function DataSummaryCard({ summary, title }: { summary: DataSummary; title: string }) {
  return (
    <div className="data-summary-card">
      <h3>{title}</h3>
      <div className="data-summary-grid">
        <DataStatusRow label="總物件" value={formatCount(summary.totalItems)} />
        <DataStatusRow label="核心層" value={formatCount(summary.coreItems)} />
        <DataStatusRow label="專案" value={formatCount(summary.projectItems)} />
        <DataStatusRow label="行動" value={formatCount(summary.actionItems)} />
        <DataStatusRow label="已完成" value={formatCount(summary.doneItems)} />
      </div>
    </div>
  )
}

function DataStatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-status-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function DataStatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-status-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ExecutionStatusCard({
  label,
  summary,
}: {
  label: string
  summary: DataStatus['project']
}) {
  return (
    <div className="execution-status-card">
      <div>
        <span>{label}</span>
        <strong>{formatCount(summary.total)}</strong>
      </div>
      <DataStatusRow label="未完成" value={formatCount(summary.open)} />
      <DataStatusRow label="已完成" value={formatCount(summary.done)} />
    </div>
  )
}

function CalendarView({
  allItems,
  entries,
  horizonEntries,
  horizonLayerFilters,
  horizonRange,
  horizonStatusFilter,
  horizonUnscheduledItems,
  layerFilters,
  month,
  roadmapEntries,
  roadmapLayerFilters,
  roadmapRange,
  roadmapStatusFilter,
  roadmapUnscheduledItems,
  selectedEntry,
  statusFilter,
  viewMode,
  onCloseDetail,
  onEditItem,
  onHorizonLayerToggle,
  onHorizonStatusFilterChange,
  onLayerToggle,
  onNextMonth,
  onNextHorizon,
  onNextRoadmap,
  onOpenItem,
  onPreviousMonth,
  onPreviousHorizon,
  onPreviousRoadmap,
  onRoadmapLayerToggle,
  onRoadmapStatusFilterChange,
  onSelectItem,
  onStatusFilterChange,
  onTodayHorizon,
  onToday,
  onTodayRoadmap,
  onToggleActionDone,
  onViewModeChange,
}: {
  allItems: LifeItem[]
  entries: CalendarRangeEntry[]
  horizonEntries: CalendarRangeEntry[]
  horizonLayerFilters: Record<HorizonLayer, boolean>
  horizonRange: WeeklyRange
  horizonStatusFilter: CalendarStatusFilter
  horizonUnscheduledItems: LifeItem[]
  layerFilters: Record<CalendarLayer, boolean>
  month: string
  roadmapEntries: CalendarRangeEntry[]
  roadmapLayerFilters: Record<RoadmapLayer, boolean>
  roadmapRange: WeeklyRange
  roadmapStatusFilter: CalendarStatusFilter
  roadmapUnscheduledItems: LifeItem[]
  selectedEntry: CalendarRangeEntry | null
  statusFilter: CalendarStatusFilter
  viewMode: CalendarViewMode
  onCloseDetail: () => void
  onEditItem: (item: LifeItem) => void
  onHorizonLayerToggle: (layer: HorizonLayer) => void
  onHorizonStatusFilterChange: (filter: CalendarStatusFilter) => void
  onLayerToggle: (layer: CalendarLayer) => void
  onNextMonth: () => void
  onNextHorizon: () => void
  onNextRoadmap: () => void
  onOpenItem: (item: LifeItem) => void
  onPreviousMonth: () => void
  onPreviousHorizon: () => void
  onPreviousRoadmap: () => void
  onRoadmapLayerToggle: (layer: RoadmapLayer) => void
  onRoadmapStatusFilterChange: (filter: CalendarStatusFilter) => void
  onSelectItem: (item: LifeItem) => void
  onStatusFilterChange: (filter: CalendarStatusFilter) => void
  onTodayHorizon: () => void
  onToday: () => void
  onTodayRoadmap: () => void
  onToggleActionDone: (item: LifeItem) => void
  onViewModeChange: (mode: CalendarViewMode) => void
}) {
  const weeks = getCalendarWeeks(month)
  const segments = buildCalendarWeekSegments(entries, weeks)
  const deadlineSegments = buildCalendarDeadlineSegments(entries, weeks, segments)
  const deadlineFlags = buildCalendarDeadlineFlags(entries, weeks, segments)
  const segmentsByWeek = weeks.map((_, weekIndex) =>
    segments.filter((segment) => segment.weekIndex === weekIndex),
  )
  const deadlineSegmentsByWeek = weeks.map((_, weekIndex) =>
    deadlineSegments.filter((segment) => segment.weekIndex === weekIndex),
  )
  const deadlineFlagsByWeek = weeks.map((_, weekIndex) =>
    deadlineFlags.filter((flag) => flag.weekIndex === weekIndex),
  )
  const hasActiveLayer = calendarLayerIds.some((layer) => layerFilters[layer])

  return (
    <section className="screen">
      <div className="section-block calendar-shell">
        <CalendarModeSwitch activeMode={viewMode} onChange={onViewModeChange} />

        {viewMode === 'month' ? (
          <>
            <div className="calendar-toolbar">
              <button className="calendar-icon-button" type="button" onClick={onPreviousMonth} aria-label="上一個月">
                ‹
              </button>
              <div className="calendar-title">
                <p className="eyebrow">{calendarViewModeLabels.month.eyebrow}</p>
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

        <div className="calendar-status-filters" aria-label="月曆狀態篩選">
          {calendarStatusFilterIds.map((filter) => (
            <button
              className={statusFilter === filter ? 'calendar-status-filter active' : 'calendar-status-filter'}
              type="button"
              key={filter}
              onClick={() => onStatusFilterChange(filter)}
              aria-pressed={statusFilter === filter}
            >
              {calendarStatusFilterLabels[filter]}
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
            const weekDeadlineSegments = deadlineSegmentsByWeek[weekIndex]
            const weekDeadlineFlags = deadlineFlagsByWeek[weekIndex]
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
                    const riskTone = getCalendarRiskTone(entry.item)
                    const label = `${getLayer(entry.layer).label} ${entry.item.title}，${entry.startDate} 到 ${entry.endDate}，${statusLabels[entry.item.status]}${entry.item.deadlineDate ? `，截止 ${entry.item.deadlineDate}` : ''}`

                    return (
                      <button
                        className={[
                          'calendar-bar',
                          `layer-${entry.layer}`,
                          `risk-${riskTone}`,
                          selectedEntry?.item.id === entry.item.id ? 'selected' : '',
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
                        onClick={() => onSelectItem(entry.item)}
                      >
                        <span className="calendar-bar-title">{entry.item.title}</span>
                      </button>
                    )
                  })}
                  {weekDeadlineSegments.map((segment) => {
                    const bufferStyle = {
                      gridColumn: `${segment.startColumn} / ${segment.endColumn + 1}`,
                      gridRow: segment.lane + 1,
                    } as CSSProperties

                    return (
                      <span
                        className="calendar-deadline-buffer"
                        key={`buffer-${segment.entry.item.id}-${weekIndex}-${segment.startColumn}-${segment.endColumn}`}
                        style={bufferStyle}
                        title={`${segment.entry.item.title} buffer：${segment.entry.item.dueDate} 到 ${segment.entry.item.deadlineDate}`}
                      />
                    )
                  })}
                  {weekDeadlineFlags.map((flag) => {
                    const flagStyle = {
                      gridColumn: `${flag.column} / ${flag.column + 1}`,
                      gridRow: flag.lane + 1,
                    } as CSSProperties

                    return (
                      <span
                        className={`calendar-deadline-flag risk-${flag.tone}`}
                        key={`deadline-${flag.entry.item.id}-${weekIndex}-${flag.column}`}
                        style={flagStyle}
                        title={flag.label}
                        aria-label={flag.label}
                      >
                        截
                      </span>
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
          <EmptyState label="這個月沒有符合篩選且具有開始日期或應完成日的行動、專案或結果" />
        ) : (
          <p className="calendar-hint">橫條使用開始日期到應完成日；截止日期作為 buffer 死線資訊。</p>
        )}
          </>
        ) : viewMode === 'quarter' ? (
          <TimelinePanel
            allItems={allItems}
            columns={getRollingWeekColumns(roadmapRange.startDate)}
            description={calendarViewModeLabels.quarter.description}
            entries={roadmapEntries}
            emptyLabel="這 13 週沒有符合篩選且具有開始日期或應完成日的目標、結果或專案"
            eyebrow={calendarViewModeLabels.quarter.eyebrow}
            layerFilters={roadmapLayerFilters}
            layerIds={roadmapLayerIds}
            range={roadmapRange}
            rangeLabel={`${roadmapRange.startDate} - ${roadmapRange.endDate}`}
            selectedItemId={selectedEntry?.item.id ?? ''}
            statusFilter={roadmapStatusFilter}
            title="滾動 13 週"
            unscheduledItems={roadmapUnscheduledItems}
            unscheduledLabel="未排入路線圖"
            onLayerToggle={onRoadmapLayerToggle}
            onNext={onNextRoadmap}
            onPrevious={onPreviousRoadmap}
            onSelectItem={onSelectItem}
            onStatusFilterChange={onRoadmapStatusFilterChange}
            onToday={onTodayRoadmap}
          />
        ) : (
          <TimelinePanel
            allItems={allItems}
            columns={getHorizonMonthColumns(horizonRange.startDate)}
            description={calendarViewModeLabels.horizon.description}
            entries={horizonEntries}
            emptyLabel="這 36 個月沒有符合篩選且具有開始日期或應完成日的目的或目標"
            eyebrow={calendarViewModeLabels.horizon.eyebrow}
            layerFilters={horizonLayerFilters}
            layerIds={horizonLayerIds}
            range={horizonRange}
            rangeLabel={`${horizonRange.startDate.slice(0, 7)} - ${horizonRange.endDate.slice(0, 7)}`}
            selectedItemId={selectedEntry?.item.id ?? ''}
            statusFilter={horizonStatusFilter}
            title="36 個月"
            unscheduledItems={horizonUnscheduledItems}
            unscheduledLabel="長期有效或未排期"
            onLayerToggle={onHorizonLayerToggle}
            onNext={onNextHorizon}
            onPrevious={onPreviousHorizon}
            onSelectItem={onSelectItem}
            onStatusFilterChange={onHorizonStatusFilterChange}
            onToday={onTodayHorizon}
          />
        )}

        {selectedEntry && (
          <CalendarDetailPanel
            allItems={allItems}
            entry={selectedEntry}
            onClose={onCloseDetail}
            onEdit={onEditItem}
            onOpen={onOpenItem}
            onToggleActionDone={onToggleActionDone}
          />
        )}
      </div>
    </section>
  )
}

function CalendarModeSwitch({
  activeMode,
  onChange,
}: {
  activeMode: CalendarViewMode
  onChange: (mode: CalendarViewMode) => void
}) {
  return (
    <div className="calendar-mode-switch" aria-label="時間視圖">
      {calendarViewModeIds.map((mode) => (
        <button
          className={activeMode === mode ? 'active' : ''}
          type="button"
          key={mode}
          onClick={() => onChange(mode)}
          aria-pressed={activeMode === mode}
        >
          <span>{calendarViewModeLabels[mode].label}</span>
          <small>{calendarViewModeLabels[mode].eyebrow}</small>
        </button>
      ))}
    </div>
  )
}

function TimelinePanel<TLayer extends TimelineLayer>({
  allItems,
  columns,
  description,
  emptyLabel,
  entries,
  eyebrow,
  layerFilters,
  layerIds,
  range,
  rangeLabel,
  selectedItemId,
  statusFilter,
  title,
  unscheduledItems,
  unscheduledLabel,
  onLayerToggle,
  onNext,
  onPrevious,
  onSelectItem,
  onStatusFilterChange,
  onToday,
}: {
  allItems: LifeItem[]
  columns: TimelineColumn[]
  description: string
  emptyLabel: string
  entries: CalendarRangeEntry[]
  eyebrow: string
  layerFilters: Record<TLayer, boolean>
  layerIds: TLayer[]
  range: WeeklyRange
  rangeLabel: string
  selectedItemId: string
  statusFilter: CalendarStatusFilter
  title: string
  unscheduledItems: LifeItem[]
  unscheduledLabel: string
  onLayerToggle: (layer: TLayer) => void
  onNext: () => void
  onPrevious: () => void
  onSelectItem: (item: LifeItem) => void
  onStatusFilterChange: (filter: CalendarStatusFilter) => void
  onToday: () => void
}) {
  const segments = buildTimelineSegments(entries, columns, layerIds)
  const layerBands = buildTimelineLayerBands(entries, columns, layerIds)
  const laneCount = segments.reduce((maximum, segment) => Math.max(maximum, segment.lane + 1), 0)
  const hasActiveLayer = layerIds.some((layer) => layerFilters[layer])
  const columnMinWidth = columns.length > 13 ? 54 : 78
  const timelineStyle = {
    gridTemplateColumns: `repeat(${columns.length}, minmax(${columnMinWidth}px, 1fr))`,
  } as CSSProperties
  const barRowStyle = {
    ...timelineStyle,
    '--timeline-bar-height': `${Math.max(laneCount, 1) * 30 + 10}px`,
  } as CSSProperties

  return (
    <>
      <div className="calendar-toolbar">
        <button className="calendar-icon-button" type="button" onClick={onPrevious} aria-label="上一段時間">
          ‹
        </button>
        <div className="calendar-title">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{rangeLabel}</p>
        </div>
        <button className="ghost-button" type="button" onClick={onToday}>
          今天
        </button>
        <button className="calendar-icon-button" type="button" onClick={onNext} aria-label="下一段時間">
          ›
        </button>
      </div>

      <p className="calendar-hint">{description}</p>

      <div className="calendar-layer-filters timeline-layer-filters" aria-label="時間軸顯示層級">
        {layerIds.map((layer) => (
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

      <div className="calendar-status-filters" aria-label="時間軸狀態篩選">
        {calendarStatusFilterIds.map((filter) => (
          <button
            className={statusFilter === filter ? 'calendar-status-filter active' : 'calendar-status-filter'}
            type="button"
            key={filter}
            onClick={() => onStatusFilterChange(filter)}
            aria-pressed={statusFilter === filter}
          >
            {calendarStatusFilterLabels[filter]}
          </button>
        ))}
      </div>

      <div className="timeline-scroll" aria-label={`${range.startDate} 到 ${range.endDate} 的時間軸`}>
        <div className="timeline-header" style={timelineStyle}>
          {columns.map((column) => (
            <div className={column.isCurrent ? 'timeline-column current' : 'timeline-column'} key={column.id}>
              <strong>{column.label}</strong>
              <span>{column.sublabel}</span>
            </div>
          ))}
        </div>

        <div className="timeline-bars" style={barRowStyle}>
          {layerBands.map((band) => (
            <span
              className={`timeline-layer-band layer-${band.layer}`}
              key={band.layer}
              style={{
                gridColumn: `1 / ${columns.length + 1}`,
                gridRow: `${band.startLane + 1} / ${band.startLane + band.laneCount + 1}`,
              }}
            >
              {getLayer(band.layer).label}
            </span>
          ))}
          {segments.map((segment) => {
            const { entry } = segment
            const barStyle = {
              gridColumn: `${segment.startColumn} / ${segment.endColumn + 1}`,
              gridRow: segment.lane + 1,
            } as CSSProperties
            const riskTone = getCalendarRiskTone(entry.item)
            const label = `${getLayer(entry.layer).label} ${entry.item.title}，${entry.startDate} 到 ${entry.endDate}，${statusLabels[entry.item.status]}${entry.item.deadlineDate ? `，截止 ${entry.item.deadlineDate}` : ''}`

            return (
              <button
                className={[
                  'timeline-bar',
                  `layer-${entry.layer}`,
                  `risk-${riskTone}`,
                  selectedItemId === entry.item.id ? 'selected' : '',
                  segment.continuesBefore ? 'continues-before' : '',
                  segment.continuesAfter ? 'continues-after' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                type="button"
                key={`${entry.item.id}-${segment.startColumn}-${segment.endColumn}`}
                style={barStyle}
                title={label}
                aria-label={label}
                onClick={() => onSelectItem(entry.item)}
              >
                <span className={`node-badge layer-${entry.layer}`}>{getLayer(entry.layer).short}</span>
                <span className="timeline-bar-title">{entry.item.title}</span>
                <span className="timeline-bar-meta">{statusLabels[entry.item.status]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {!hasActiveLayer ? (
        <EmptyState label="請至少開啟一個層級篩選" />
      ) : entries.length === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <p className="calendar-hint">時間軸使用開始日期到應完成日；沒有日期的物件會列在下方。</p>
      )}

      {unscheduledItems.length > 0 && (
        <div className="timeline-unscheduled">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">{unscheduledLabel}</p>
              <h3>{unscheduledItems.length} 個物件</h3>
            </div>
          </div>
          <div className="timeline-unscheduled-list">
            {unscheduledItems.map((item) => (
              <div className="timeline-unscheduled-item" key={item.id}>
                <span className={`node-badge layer-${item.layer}`}>{getLayer(item.layer).short}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.note || connectionSummary(item, allItems)}</p>
                </div>
                <span>{statusLabels[item.status]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function CalendarDetailPanel({
  allItems,
  entry,
  onClose,
  onEdit,
  onOpen,
  onToggleActionDone,
}: {
  allItems: LifeItem[]
  entry: CalendarRangeEntry
  onClose: () => void
  onEdit: (item: LifeItem) => void
  onOpen: (item: LifeItem) => void
  onToggleActionDone: (item: LifeItem) => void
}) {
  const { item } = entry
  const riskTone = getCalendarRiskTone(item)
  const detailMeta = getCalendarDetailMeta(item)

  return (
    <article className={`calendar-detail-panel risk-${riskTone}`}>
      <div className="calendar-detail-heading">
        <div className="calendar-detail-title">
          <span className={`node-badge layer-${item.layer}`}>{getLayer(item.layer).short}</span>
          <div>
            <p className="eyebrow">{getLayer(item.layer).label}</p>
            <h3>{item.title}</h3>
          </div>
        </div>
        <span className={`calendar-risk-pill risk-${riskTone}`}>{calendarRiskText(item)}</span>
      </div>

      <p className="muted">{item.note || connectionSummary(item, allItems)}</p>

      <div className="calendar-detail-grid">
        <DetailMeta label="狀態" value={statusLabels[item.status]} />
        <DetailMeta label="開始日期" value={item.startDate || '未設定'} />
        <DetailMeta label="應完成日" value={item.dueDate || '未設定'} />
        <DetailMeta label="截止日期" value={item.deadlineDate || '未設定'} />
        <DetailMeta label="完成日期" value={item.completedDate || '未完成'} />
        <DetailMeta label="顯示期間" value={`${entry.startDate} - ${entry.endDate}`} />
        <DetailMeta label="時間狀態" value={detailMeta} />
        <DetailMeta label="連結" value={connectionSummary(item, allItems)} />
      </div>

      <div className="calendar-detail-actions">
        <button type="button" onClick={() => onOpen(item)}>
          查看關係
        </button>
        <button className="ghost-button" type="button" onClick={() => onEdit(item)}>
          編輯
        </button>
        {item.layer === 'action' && (
          <button className="ghost-button" type="button" onClick={() => onToggleActionDone(item)}>
            {item.status === 'done' ? '改回進行中' : '標記完成'}
          </button>
        )}
        <button className="ghost-button" type="button" onClick={onClose}>
          關閉
        </button>
      </div>
    </article>
  )
}

function DetailMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
          {item.note.trim() && <p className="relationship-note">{item.note}</p>}
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
              <option value="dueDate">應完成日</option>
              <option value="deadlineDate">截止日期</option>
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

function findEncyclopediaArticle(articleId: string) {
  return (
    encyclopediaSections.flatMap((section) => section.articles).find((article) => article.id === articleId) ??
    encyclopediaSections[0].articles[0]
  )
}

function analyzeImportFile(fileText: string, fileName: string, fileSize: number): ImportAnalysisResult {
  const parsed = JSON.parse(fileText) as { exportedAt?: unknown; items?: unknown[]; version?: unknown }
  if (!Array.isArray(parsed.items)) throw new Error('Invalid file')

  const validItems = parsed.items.map(normalizeItem).filter(Boolean) as LifeItem[]
  const version =
    typeof parsed.version === 'number' || typeof parsed.version === 'string'
      ? `v${parsed.version}`
      : '未提供'

  return {
    preview: {
      fileName,
      fileSize,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
      version,
      totalItemCount: parsed.items.length,
      validItemCount: validItems.length,
      invalidItemCount: parsed.items.length - validItems.length,
      summary: getDataSummary(validItems),
      validItems,
    },
  }
}

function getDataSummary(items: LifeItem[]): DataSummary {
  const layerCounts = Object.fromEntries(layers.map((layer) => [layer.id, 0])) as Record<LayerId, number>

  for (const item of items) {
    layerCounts[item.layer] += 1
  }

  return {
    totalItems: items.length,
    coreItems: coreLayerIds.reduce((total, layer) => total + layerCounts[layer], 0),
    projectItems: layerCounts.project,
    actionItems: layerCounts.action,
    doneItems: items.filter((item) => item.status === 'done').length,
    layerCounts,
  }
}

function buildArchivePreview(items: LifeItem[], mode: ArchiveMode): ArchivePreview {
  const candidates = getArchiveCandidates(items, mode)
  const archiveItems = uniqueItems([...candidates.projects, ...candidates.actions]).sort(compareArchiveItems)
  const itemIds = archiveItems.map((item) => item.id)

  return {
    mode,
    createdAt: new Date().toISOString(),
    ...candidates,
    items: archiveItems,
    itemIds,
    impact: getArchiveImpactSummary(items, {
      ...candidates,
      items: archiveItems,
      itemIds,
    }),
  }
}

function getArchiveCandidates(items: LifeItem[], mode: ArchiveMode): ArchiveCandidateResult {
  if (mode === 'actions') {
    return {
      projects: [],
      actions: getSafeActionArchiveItems(items),
      protectedActionCount: 0,
    }
  }

  return getSafeProjectArchiveItems(items)
}

function getSafeActionArchiveItems(items: LifeItem[]) {
  const actionCutoff = addDays(currentDate(), -ACTION_ARCHIVE_DAYS)

  return items
    .filter(
      (item) =>
        item.layer === 'action' &&
        item.status === 'done' &&
        Boolean(item.completedDate) &&
        item.completedDate <= actionCutoff,
    )
    .sort(compareArchiveItems)
}

function getSafeProjectArchiveItems(items: LifeItem[]): ArchiveCandidateResult {
  const projectCutoff = addDays(currentDate(), -PROJECT_ARCHIVE_DAYS)
  const projects = items
    .filter((item) => {
      if (
        item.layer !== 'project' ||
        item.status !== 'done' ||
        !item.completedDate ||
        item.completedDate > projectCutoff
      ) {
        return false
      }

      return !items.some(
        (candidate) =>
          candidate.layer === 'action' &&
          candidate.status !== 'done' &&
          candidate.parentIds.includes(item.id),
      )
    })
    .sort(compareArchiveItems)

  const projectIds = new Set(projects.map((project) => project.id))
  const linkedDoneActions = items.filter(
    (item) =>
      item.layer === 'action' &&
      item.status === 'done' &&
      item.parentIds.some((parentId) => projectIds.has(parentId)),
  )
  const actions = linkedDoneActions
    .filter((item) => item.parentIds.length > 0 && item.parentIds.every((parentId) => projectIds.has(parentId)))
    .sort(compareArchiveItems)
  const archivedActionIds = new Set(actions.map((action) => action.id))
  const protectedActionCount = linkedDoneActions.filter((item) => !archivedActionIds.has(item.id)).length

  return { projects, actions, protectedActionCount }
}

function getArchiveImpactSummary(
  items: LifeItem[],
  archive: ArchiveCandidateResult & { items: LifeItem[]; itemIds: string[] },
): ArchiveImpactSummary {
  const remainingItems = removeArchivedItems(items, archive)

  return {
    projectCount: archive.projects.length,
    actionCount: archive.actions.length,
    retainedPillars: remainingItems.filter((item) => item.layer === 'pillar').length,
    retainedGoals: remainingItems.filter((item) => item.layer === 'goal').length,
    retainedOutcomes: remainingItems.filter((item) => item.layer === 'outcome').length,
    protectedActionCount: archive.protectedActionCount,
    estimatedBytesBefore: estimateJsonSize(items),
    estimatedBytesAfter: estimateJsonSize(remainingItems),
    estimatedBytesReduction: Math.max(0, estimateJsonSize(items) - estimateJsonSize(remainingItems)),
  }
}

function exportArchiveJson(preview: ArchivePreview) {
  const payload: ArchiveExportPayload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    archive: {
      mode: preview.mode,
      label: archiveModeLabels[preview.mode],
      itemCount: preview.items.length,
      projectCount: preview.projects.length,
      actionCount: preview.actions.length,
      removedFromMainData: false,
    },
    items: preview.items,
  }
  const filename =
    preview.mode === 'actions'
      ? `ppv-lifeos-archive-actions-${currentDate()}.json`
      : `ppv-lifeos-archive-projects-actions-${currentDate()}.json`

  downloadJsonFile(payload, filename)
}

function removeArchivedItems(
  items: LifeItem[],
  archive: { itemIds: string[] },
) {
  const archivedIds = new Set(archive.itemIds)
  return items
    .filter((item) => !archivedIds.has(item.id))
    .map((item) => {
      const parentIds = item.parentIds.filter((parentId) => !archivedIds.has(parentId))
      return parentIds.length === item.parentIds.length
        ? item
        : {
            ...item,
            parentIds,
            updatedDate: currentDate(),
          }
    })
}

function compareArchiveItems(left: LifeItem, right: LifeItem) {
  const layerOrder = ['project', 'action']
  const layerDiff = layerOrder.indexOf(left.layer) - layerOrder.indexOf(right.layer)
  if (layerDiff !== 0) return layerDiff

  const dateDiff = left.completedDate.localeCompare(right.completedDate)
  if (dateDiff !== 0) return dateDiff

  return left.title.localeCompare(right.title, 'zh-Hant')
}

function getDataStatus(items: LifeItem[]): DataStatus {
  const coreCounts = Object.fromEntries(layers.map((layer) => [layer.id, 0])) as Record<LayerId, number>

  for (const item of items) {
    coreCounts[item.layer] += 1
  }

  const projectItems = items.filter((item) => item.layer === 'project')
  const actionItems = items.filter((item) => item.layer === 'action')
  const archiveCandidates = getArchiveCandidateCounts(items)

  return {
    totalCount: items.length,
    estimatedJsonBytes: estimateJsonSize(items),
    coreCounts,
    project: {
      total: projectItems.length,
      open: projectItems.filter((item) => item.status !== 'done').length,
      done: projectItems.filter((item) => item.status === 'done').length,
    },
    action: {
      total: actionItems.length,
      open: actionItems.filter((item) => item.status !== 'done').length,
      done: actionItems.filter((item) => item.status === 'done').length,
    },
    archiveCandidates,
  }
}

function estimateJsonSize(items: LifeItem[]) {
  return new Blob([JSON.stringify({ version: 3, items })]).size
}

function downloadJsonFile(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function getArchiveCandidateCounts(items: LifeItem[]) {
  const actionCandidates = getArchiveCandidates(items, 'actions')
  const projectCandidates = getArchiveCandidates(items, 'projects-actions')

  return {
    actions: actionCandidates.actions.length,
    projects: projectCandidates.projects.length,
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`

  const kilobytes = bytes / 1024
  if (kilobytes < 1024) return `${formatCompactNumber(kilobytes)} KB`

  return `${formatCompactNumber(kilobytes / 1024)} MB`
}

function formatFileSize(bytes: number) {
  return formatBytes(bytes)
}

function formatCount(value: number) {
  return value.toLocaleString('zh-Hant')
}

function formatCompactNumber(value: number) {
  return value >= 10 ? value.toFixed(0) : value.toFixed(1)
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
  const candidate = item as ItemInput
  if ('scheduledDate' in candidate) return null
  if (typeof candidate.id !== 'string' || !isLayer(candidate.layer) || typeof candidate.title !== 'string') {
    return null
  }
  if (
    typeof candidate.note !== 'string' ||
    !Array.isArray(candidate.parentIds) ||
    typeof candidate.createdDate !== 'string' ||
    typeof candidate.updatedDate !== 'string' ||
    typeof candidate.startDate !== 'string' ||
    typeof candidate.completedDate !== 'string' ||
    typeof candidate.dueDate !== 'string' ||
    typeof candidate.deadlineDate !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    layer: candidate.layer,
    title: candidate.title,
    note: candidate.note,
    parentIds: candidate.parentIds.filter((id): id is string => typeof id === 'string'),
    status: isStatus(candidate.status) ? candidate.status : 'active',
    createdDate: normalizeDate(candidate.createdDate),
    updatedDate: normalizeDate(candidate.updatedDate),
    startDate: normalizeDate(candidate.startDate),
    completedDate: normalizeDate(candidate.completedDate),
    dueDate: normalizeDate(candidate.dueDate),
    deadlineDate: normalizeDate(candidate.deadlineDate),
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
    field === 'dueDate' ||
    field === 'deadlineDate' ||
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
    dueDate: '',
    deadlineDate: '',
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

function getParentOptions(
  parentOptions: LifeItem[],
  selectedParentIds: string[],
  searchText: string,
  statusView: ParentStatusView,
) {
  const selectedIds = new Set(selectedParentIds)
  const normalizedSearch = searchText.trim().toLowerCase()

  return parentOptions
    .filter((item) => {
      if (selectedIds.has(item.id)) return true

      const matchesSearch =
        !normalizedSearch ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.note.toLowerCase().includes(normalizedSearch)
      if (!matchesSearch) return false

      if (statusView === 'open') return item.status !== 'done'
      if (statusView === 'done') return item.status === 'done'
      return true
    })
    .sort((left, right) => compareParentOptions(left, right, selectedIds))
}

function compareParentOptions(left: LifeItem, right: LifeItem, selectedIds: Set<string>) {
  const leftSelected = selectedIds.has(left.id)
  const rightSelected = selectedIds.has(right.id)
  if (leftSelected !== rightSelected) return leftSelected ? -1 : 1

  const leftDone = left.status === 'done'
  const rightDone = right.status === 'done'
  if (leftDone !== rightDone) return leftDone ? 1 : -1

  const updatedCompared = right.updatedDate.localeCompare(left.updatedDate)
  return updatedCompared === 0 ? left.title.localeCompare(right.title, 'zh-Hant') : updatedCompared
}

function getReviewData(items: LifeItem[], granularity: ReviewGranularity, range: ReviewRange): ReviewData {
  if (granularity === 'week') return getWeeklyReviewData(items, range)
  if (granularity === 'month') return getMonthlyReviewData(items, range)
  if (granularity === 'quarter') return getQuarterlyReviewData(items, range)
  return getYearlyReviewData(items, range)
}

function getWeeklyReviewData(items: LifeItem[], range: ReviewRange): ReviewData {
  const metrics = getWeeklyMetrics(items, range)
  const issues = getAlignmentIssues(items)
  const completedActions = metrics.find((metric) => metric.id === 'completed-actions')?.items.length ?? 0
  const overdueItems = metrics.find((metric) => metric.id === 'overdue')?.items.length ?? 0
  const unlinkedItems = metrics.find((metric) => metric.id === 'unlinked')?.items.length ?? 0
  const noActionProjectCount = issues.filter((issue) => issue.kind === 'active-project-without-active-action').length

  return {
    intro: '用完成行動、逾期事項、即將到期與連結斷點，檢查行動是否真的推進結果。',
    summaries: [
      { label: '完成行動', value: completedActions, tone: completedActions > 0 ? 'low' : 'medium' },
      { label: '逾期事項', value: overdueItems, tone: overdueItems > 0 ? 'high' : 'low' },
      { label: '未連結', value: unlinkedItems, tone: unlinkedItems > 0 ? 'medium' : 'low' },
      { label: '無下一步專案', value: noActionProjectCount, tone: noActionProjectCount > 0 ? 'medium' : 'low' },
    ],
    metrics,
    sections: [],
  }
}

function getMonthlyReviewData(items: LifeItem[], range: ReviewRange): ReviewData {
  const progressByLayer = getProgressByLayer(items, range)
  const pillarProgress = getProgressByPillar(items, range)
  const completedResults = progressByLayer.outcome
  const missedResults = getMissedDueItemsInRange(items, range, ['outcome'])
  const progressedGoals = getLinkedAncestorsForItems(completedResults, items, 'goal')
  const noProgressGoals = getOpenItemsWithoutLinkedProgress(items, 'goal', completedResults)
  const progressedPillars = pillarProgress
    .filter((progress) => progress.items.length > 0)
    .map((progress) => progress.pillar)
    .sort(compareWorkItems)
  const noOutcomePillars = getOpenItemsWithoutLinkedProgress(items, 'pillar', completedResults)
  const activeOutcomesWithoutProject = items
    .filter((item) => item.layer === 'outcome' && item.status === 'active' && !hasChildWithStatus(item, items, 'project', 'active'))
    .sort(compareWorkItems)
  const nextMonthRange = getReviewRange('month', shiftReviewAnchor('month', range.startDate, 1))
  const nextMonthDueResults = getDueItemsInRange(items, nextMonthRange, ['outcome'])
  const activeProjectsWithoutAction = items
    .filter((item) => item.layer === 'project' && item.status === 'active' && !hasChildWithStatus(item, items, 'action', 'active'))
    .sort(compareWorkItems)

  return {
    intro: '用結果交付、目標推進與支柱平衡，檢查本月執行是否變成可觀察成果。',
    summaries: [
      { label: '完成結果', value: completedResults.length, tone: completedResults.length > 0 ? 'low' : 'medium' },
      { label: '未交付結果', value: missedResults.length, tone: missedResults.length > 0 ? 'high' : 'low' },
      { label: '無推進目標', value: noProgressGoals.length, tone: noProgressGoals.length > 0 ? 'medium' : 'low' },
      { label: '無成果支柱', value: noOutcomePillars.length, tone: noOutcomePillars.length > 0 ? 'medium' : 'low' },
    ],
    metrics: [
      { id: 'month-completed-results', label: '本月完成結果', items: completedResults },
      { id: 'month-missed-results', label: '本月未交付結果', items: missedResults },
      { id: 'month-progressed-goals', label: '有結果推進的目標', items: progressedGoals },
      { id: 'month-progressed-pillars', label: '有成果支撐的支柱', items: progressedPillars },
    ],
    sections: [
      {
        id: 'month-outcome-delivery',
        eyebrow: '結果交付',
        title: '完成結果與逾期結果',
        items: uniqueItems([...completedResults, ...missedResults, ...activeOutcomesWithoutProject]).sort(compareWorkItems),
        emptyLabel: '本月沒有結果交付或逾期結果。',
      },
      {
        id: 'month-goal-progress',
        eyebrow: '目標推進',
        title: '沒有結果推進的目標',
        items: noProgressGoals,
        emptyLabel: '目前沒有缺少結果推進的目標。',
      },
      {
        id: 'month-pillar-balance',
        eyebrow: '支柱平衡',
        title: '本月有推進或缺少成果的支柱',
        items: uniqueItems([...progressedPillars, ...noOutcomePillars]).sort(compareWorkItems),
        emptyLabel: '目前沒有可檢查的支柱資料。',
      },
      {
        id: 'month-next-prep',
        eyebrow: '下月準備',
        title: '下月結果與需要下一步的專案',
        items: uniqueItems([...nextMonthDueResults, ...activeProjectsWithoutAction]).sort(compareWorkItems),
        emptyLabel: '目前沒有下月應交付結果或缺少下一步的專案。',
      },
    ],
  }
}

function getQuarterlyReviewData(items: LifeItem[], range: ReviewRange): ReviewData {
  const progressByLayer = getProgressByLayer(items, range)
  const completedResults = progressByLayer.outcome
  const missedResults = getMissedDueItemsInRange(items, range, ['outcome'])
  const progressedGoals = getLinkedAncestorsForItems(completedResults, items, 'goal')
  const stalledGoals = getOpenItemsWithoutLinkedProgress(items, 'goal', completedResults)
  const progressedPurposes = getLinkedAncestorsForItems(completedResults, items, 'purpose')
  const stalledPurposes = getOpenItemsWithoutLinkedProgress(items, 'purpose', completedResults)
  const progressedPillars = getLinkedAncestorsForItems(completedResults, items, 'pillar')
  const allOpenPillars = items.filter((item) => item.layer === 'pillar' && item.status !== 'done')
  const imbalancedPillars = allOpenPillars
    .filter((pillar) => !progressedPillars.some((progressed) => progressed.id === pillar.id))
    .sort(compareWorkItems)
  const nextQuarterRange = getReviewRange('quarter', shiftReviewAnchor('quarter', range.startDate, 1))
  const nextQuarterDueItems = getDueItemsInRange(items, nextQuarterRange, ['goal', 'outcome'])

  return {
    intro: '用目標推進、結果組合、目的對齊與支柱失衡，檢查這一季的策略是否仍值得延續。',
    summaries: [
      { label: '推進目標', value: progressedGoals.length, tone: progressedGoals.length > 0 ? 'low' : 'medium' },
      { label: '停滯目標', value: stalledGoals.length, tone: stalledGoals.length > 0 ? 'medium' : 'low' },
      { label: '完成結果', value: completedResults.length, tone: completedResults.length > 0 ? 'low' : 'medium' },
      { label: '失衡支柱', value: imbalancedPillars.length, tone: imbalancedPillars.length > 0 ? 'medium' : 'low' },
    ],
    metrics: [
      { id: 'quarter-progressed-goals', label: '本季推進目標', items: progressedGoals },
      { id: 'quarter-stalled-goals', label: '停滯目標', items: stalledGoals },
      { id: 'quarter-completed-results', label: '本季完成結果', items: completedResults },
      { id: 'quarter-progressed-purposes', label: '有推進目的', items: progressedPurposes },
    ],
    sections: [
      {
        id: 'quarter-goal-check',
        eyebrow: '目標檢查',
        title: '推進目標與停滯目標',
        items: uniqueItems([...progressedGoals, ...stalledGoals]).sort(compareWorkItems),
        emptyLabel: '目前沒有可檢查的目標。',
      },
      {
        id: 'quarter-outcome-mix',
        eyebrow: '結果組合',
        title: '完成結果與未完成結果',
        items: uniqueItems([...completedResults, ...missedResults]).sort(compareWorkItems),
        emptyLabel: '本季沒有完成或逾期結果。',
      },
      {
        id: 'quarter-purpose-alignment',
        eyebrow: '目的對齊',
        title: '有推進與長期無推進的目的',
        items: uniqueItems([...progressedPurposes, ...stalledPurposes]).sort(compareWorkItems),
        emptyLabel: '目前沒有可檢查的目的。',
      },
      {
        id: 'quarter-next-prep',
        eyebrow: '下季準備',
        title: '下季應完成目標與結果',
        items: nextQuarterDueItems,
        emptyLabel: '目前沒有下季應完成的目標或結果。',
      },
    ],
  }
}

function getYearlyReviewData(items: LifeItem[], range: ReviewRange): ReviewData {
  const progressByLayer = getProgressByLayer(items, range)
  const completedResults = progressByLayer.outcome
  const completedGoals = progressByLayer.goal
  const progressedPillars = getLinkedAncestorsForItems(completedResults, items, 'pillar')
  const inactivePillars = getOpenItemsWithoutLinkedProgress(items, 'pillar', completedResults)
  const progressedPurposes = getLinkedAncestorsForItems(completedResults, items, 'purpose')
  const inactivePurposes = getOpenItemsWithoutLinkedProgress(items, 'purpose', completedResults)
  const supportedPrinciples = getLinkedAncestorsForItems(completedResults, items, 'principle')
  const nextYearRange = getReviewRange('year', shiftReviewAnchor('year', range.startDate, 1))
  const nextYearDueGoals = getDueItemsInRange(items, nextYearRange, ['goal'])
  const activeGoalsWithoutResults = getOpenItemsWithoutLinkedProgress(items, 'goal', completedResults)

  return {
    intro: '用年度成果、支柱承重、目的檢查與原則校準，檢查整體人生架構是否仍符合真正相信的方向。',
    summaries: [
      { label: '完成結果', value: completedResults.length, tone: completedResults.length > 0 ? 'low' : 'medium' },
      { label: '完成目標', value: completedGoals.length, tone: completedGoals.length > 0 ? 'low' : 'medium' },
      { label: '推進支柱', value: progressedPillars.length, tone: progressedPillars.length > 0 ? 'low' : 'medium' },
      { label: '無推進支柱', value: inactivePillars.length, tone: inactivePillars.length > 0 ? 'medium' : 'low' },
    ],
    metrics: [
      { id: 'year-completed-results', label: '年度完成結果', items: completedResults },
      { id: 'year-completed-goals', label: '年度完成目標', items: completedGoals },
      { id: 'year-progressed-pillars', label: '有推進支柱', items: progressedPillars },
      { id: 'year-supported-principles', label: '被成果支持的原則', items: supportedPrinciples },
    ],
    sections: [
      {
        id: 'year-outcome-map',
        eyebrow: '年度成果地圖',
        title: '按成果回看年度推進',
        items: completedResults,
        emptyLabel: '本年度尚未完成結果。',
      },
      {
        id: 'year-pillar-load',
        eyebrow: '支柱承重',
        title: '有推進與長期無推進的支柱',
        items: uniqueItems([...progressedPillars, ...inactivePillars]).sort(compareWorkItems),
        emptyLabel: '目前沒有可檢查的支柱。',
      },
      {
        id: 'year-purpose-check',
        eyebrow: '目的檢查',
        title: '有成果支撐與失去推進的目的',
        items: uniqueItems([...progressedPurposes, ...inactivePurposes]).sort(compareWorkItems),
        emptyLabel: '目前沒有可檢查的目的。',
      },
      {
        id: 'year-next-prep',
        eyebrow: '明年準備',
        title: '明年目標與缺少結果的目標',
        items: uniqueItems([...nextYearDueGoals, ...activeGoalsWithoutResults]).sort(compareWorkItems),
        emptyLabel: '目前沒有明年應完成目標或缺少結果的目標。',
      },
    ],
  }
}

function getWeeklyMetrics(items: LifeItem[], weekRange: WeeklyRange): WeeklyMetric[] {
  const completedActions = items
    .filter(
      (item) =>
        item.layer === 'action' &&
        item.status === 'done' &&
        isDateInRange(item.completedDate, weekRange),
    )
    .sort(compareWorkItems)
  const overdueItems = isDateInRange(currentDate(), weekRange)
    ? items.filter((item) => isOverdue(item)).sort(compareWorkItems)
    : getMissedDueItemsInRange(items, weekRange)
  const unlinkedItems = items
    .filter((item) => Boolean(getLayer(item.layer).parent) && item.parentIds.length === 0)
    .sort(compareWorkItems)
  const upcomingItems = getUpcomingDueItems(items, currentDate(), 7)
  const activeOutcomes = items
    .filter((item) => item.layer === 'outcome' && item.status === 'active')
    .sort(compareWorkItems)
  const activeProjects = items
    .filter((item) => item.layer === 'project' && item.status === 'active')
    .sort(compareWorkItems)

  return [
    { id: 'completed-actions', label: '本週完成行動', items: completedActions },
    { id: 'overdue', label: '逾期事項', items: overdueItems },
    { id: 'unlinked', label: '未連結物件', items: unlinkedItems },
    { id: 'upcoming', label: '接下來 7 天應完成', items: upcomingItems },
    { id: 'active-outcomes', label: '進行中結果', items: activeOutcomes },
    { id: 'active-projects', label: '進行中專案', items: activeProjects },
  ]
}

function getCompletedItemsInRange(items: LifeItem[], range: WeeklyRange, layerFilter?: LayerId[]) {
  return items
    .filter(
      (item) =>
        (!layerFilter || layerFilter.includes(item.layer)) &&
        item.status === 'done' &&
        isDateInRange(item.completedDate, range),
    )
    .sort(compareWorkItems)
}

function getDueItemsInRange(items: LifeItem[], range: WeeklyRange, layerFilter?: LayerId[]) {
  return items
    .filter(
      (item) =>
        (!layerFilter || layerFilter.includes(item.layer)) &&
        Boolean(item.dueDate) &&
        isDateInRange(item.dueDate, range),
    )
    .sort(compareWorkItems)
}

function getMissedDueItemsInRange(items: LifeItem[], range: WeeklyRange, layerFilter?: LayerId[]) {
  return items
    .filter(
      (item) =>
        (!layerFilter || layerFilter.includes(item.layer)) &&
        item.status !== 'done' &&
        Boolean(item.dueDate) &&
        item.dueDate < currentDate() &&
        isDateInRange(item.dueDate, range),
    )
    .sort(compareWorkItems)
}

function getProgressByLayer(items: LifeItem[], range: WeeklyRange) {
  return Object.fromEntries(
    layers.map((layer) => [
      layer.id,
      getCompletedItemsInRange(items, range, [layer.id]),
    ]),
  ) as Record<LayerId, LifeItem[]>
}

function getProgressByPillar(items: LifeItem[], range: WeeklyRange) {
  const completedWork = getCompletedItemsInRange(items, range, ['outcome', 'project', 'action'])

  return items
    .filter((item) => item.layer === 'pillar')
    .map((pillar) => ({
      pillar,
      items: completedWork.filter((item) =>
        getLinkedAncestorsByLayer(item, items, 'pillar').some((ancestor) => ancestor.id === pillar.id),
      ),
    }))
}

function getLinkedAncestorsByLayer(
  item: LifeItem,
  items: LifeItem[],
  layer: LayerId,
  visitedIds: Set<string> = new Set(),
): LifeItem[] {
  return item.parentIds.flatMap((parentId) => {
    if (visitedIds.has(parentId)) return []

    const parent = items.find((candidate) => candidate.id === parentId)
    if (!parent) return []

    const nextVisited = new Set([...visitedIds, parentId])
    const ancestors = getLinkedAncestorsByLayer(parent, items, layer, nextVisited)
    return parent.layer === layer ? [parent, ...ancestors] : ancestors
  })
}

function getLinkedAncestorsForItems(itemsToTrace: LifeItem[], allItems: LifeItem[], layer: LayerId) {
  return uniqueItems(
    itemsToTrace.flatMap((item) => getLinkedAncestorsByLayer(item, allItems, layer)),
  ).sort(compareWorkItems)
}

function getOpenItemsWithoutLinkedProgress(
  items: LifeItem[],
  layer: LayerId,
  progressItems: LifeItem[],
) {
  return items
    .filter((item) => item.layer === layer && item.status !== 'done')
    .filter(
      (item) =>
        !progressItems.some((progressItem) =>
          getLinkedAncestorsByLayer(progressItem, items, layer).some((ancestor) => ancestor.id === item.id),
        ),
    )
    .sort(compareWorkItems)
}

function uniqueItems(items: LifeItem[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values())
}

function getAlignmentIssues(items: LifeItem[]): AlignmentIssue[] {
  const issues: AlignmentIssue[] = []
  const today = currentDate()
  const nextSevenDays = addDays(today, 7)

  items.forEach((item) => {
    if (item.status !== 'done') {
      if (item.layer === 'action' && !hasLinkedParentOfLayer(item, items, 'project')) {
        issues.push(makeIssue('action-without-project', item, '這個行動沒有連到任何專案，容易變成孤立待辦。'))
      }

      if (item.layer === 'project' && !hasLinkedParentOfLayer(item, items, 'outcome')) {
        issues.push(makeIssue('project-without-outcome', item, '這個專案沒有連到結果，難以判斷它要創造什麼交付物。'))
      }

      if (item.layer === 'outcome' && !hasLinkedParentOfLayer(item, items, 'goal')) {
        issues.push(makeIssue('outcome-without-goal', item, '這個結果沒有連到目標，可能缺少上層方向。'))
      }

      if (isOverdue(item)) {
        issues.push(makeIssue('overdue-open-item', item, '這個物件已超過應完成日，但狀態仍未完成。'))
      }
    }

    if (
      item.layer === 'outcome' &&
      item.status === 'active' &&
      !hasChildWithStatus(item, items, 'project', 'active')
    ) {
      issues.push(
        makeIssue(
          'active-outcome-without-active-project',
          item,
          '這個進行中結果目前沒有進行中的專案支撐。',
          {
            label: '新增專案',
            layer: 'project',
            parentId: item.id,
          },
        ),
      )
    }

    if (
      item.layer === 'project' &&
      item.status === 'active' &&
      !hasChildWithStatus(item, items, 'action', 'active')
    ) {
      issues.push(
        makeIssue(
          'active-project-without-active-action',
          item,
          '這個進行中專案目前沒有進行中的下一步行動。',
          {
            label: '新增行動',
            layer: 'action',
            parentId: item.id,
          },
        ),
      )
    }

    if (item.layer === 'project' && item.status === 'done' && hasOpenChild(item, items, 'action')) {
      issues.push(makeIssue('done-project-with-open-action', item, '這個專案已完成，但底下仍有未完成行動。'))
    }

    if (item.layer === 'outcome' && item.status === 'done' && hasOpenChild(item, items, 'project')) {
      issues.push(makeIssue('done-outcome-with-open-project', item, '這個結果已完成，但底下仍有未完成或進行中的專案。'))
    }

    if (
      item.layer === 'project' &&
      item.status !== 'done' &&
      item.deadlineDate >= today &&
      item.deadlineDate <= nextSevenDays &&
      !hasChildWithStatus(item, items, 'action', 'active')
    ) {
      issues.push(
        makeIssue(
          'deadline-risk-project-without-active-action',
          item,
          '這個專案的截止日期在 7 天內，但目前沒有進行中的行動。',
          {
            label: '新增行動',
            layer: 'action',
            parentId: item.id,
          },
        ),
      )
    }
  })

  return issues.sort(compareAlignmentIssues)
}

function getAlignmentIssueGroups(issues: AlignmentIssue[]): AlignmentIssueGroup[] {
  return Object.entries(alignmentIssueLabels)
    .map(([kind, label]) => ({
      kind: kind as AlignmentIssueKind,
      label,
      count: issues.filter((issue) => issue.kind === kind).length,
    }))
    .filter((group) => group.count > 0)
}

function makeIssue(
  kind: AlignmentIssueKind,
  item: LifeItem,
  description: string,
  createAction?: AlignmentIssue['createAction'],
): AlignmentIssue {
  return {
    kind,
    item,
    title: alignmentIssueLabels[kind],
    description,
    severity: getIssueSeverity(kind),
    createAction,
  }
}

function getIssueSeverity(kind: AlignmentIssueKind): AlignmentSeverity {
  if (
    kind === 'overdue-open-item' ||
    kind === 'deadline-risk-project-without-active-action' ||
    kind === 'done-project-with-open-action' ||
    kind === 'done-outcome-with-open-project'
  ) {
    return 'high'
  }

  if (
    kind === 'active-outcome-without-active-project' ||
    kind === 'active-project-without-active-action'
  ) {
    return 'medium'
  }

  return 'low'
}

function compareAlignmentIssues(left: AlignmentIssue, right: AlignmentIssue) {
  const severityCompared = severityRank(left.severity) - severityRank(right.severity)
  if (severityCompared !== 0) return severityCompared

  const kindCompared =
    Object.keys(alignmentIssueLabels).indexOf(left.kind) -
    Object.keys(alignmentIssueLabels).indexOf(right.kind)
  if (kindCompared !== 0) return kindCompared

  return compareWorkItems(left.item, right.item)
}

function severityRank(severity: AlignmentSeverity) {
  if (severity === 'high') return 0
  if (severity === 'medium') return 1
  return 2
}

function hasLinkedParentOfLayer(item: LifeItem, items: LifeItem[], parentLayer: LayerId) {
  return item.parentIds.some((parentId) =>
    items.some((candidate) => candidate.id === parentId && candidate.layer === parentLayer),
  )
}

function hasChildWithStatus(item: LifeItem, items: LifeItem[], childLayer: LayerId, status: Status) {
  return items.some(
    (candidate) =>
      candidate.layer === childLayer &&
      candidate.status === status &&
      candidate.parentIds.includes(item.id),
  )
}

function hasOpenChild(item: LifeItem, items: LifeItem[], childLayer: LayerId) {
  return items.some(
    (candidate) =>
      candidate.layer === childLayer &&
      candidate.status !== 'done' &&
      candidate.parentIds.includes(item.id),
  )
}

function getWeekRange(date: string): WeeklyRange {
  const target = parseLocalDate(date)
  const day = target.getDay() || 7
  const weekStart = new Date(target)
  weekStart.setDate(target.getDate() - day + 1)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return {
    startDate: formatLocalDate(weekStart),
    endDate: formatLocalDate(weekEnd),
  }
}

function getReviewRange(granularity: ReviewGranularity, anchorDate: string): ReviewRange {
  if (granularity === 'week') {
    const range = getWeekRange(anchorDate)
    return {
      ...range,
      label: `${range.startDate} - ${range.endDate}`,
    }
  }

  if (granularity === 'month') {
    const startDate = getMonthKey(anchorDate)
    return {
      startDate,
      endDate: getMonthEnd(startDate),
      label: formatMonthLabel(startDate),
    }
  }

  if (granularity === 'quarter') {
    const target = parseLocalDate(anchorDate)
    const year = target.getFullYear()
    const quarterIndex = Math.floor(target.getMonth() / 3)
    const start = new Date(year, quarterIndex * 3, 1)
    const end = new Date(year, quarterIndex * 3 + 3, 0)

    return {
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end),
      label: `${year} Q${quarterIndex + 1}`,
    }
  }

  const year = anchorDate.slice(0, 4)
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    label: `${year} 年`,
  }
}

function shiftReviewAnchor(granularity: ReviewGranularity, anchorDate: string, direction: -1 | 1) {
  if (granularity === 'week') return addDays(anchorDate, direction * 7)
  if (granularity === 'month') return shiftMonth(getMonthKey(anchorDate), direction)
  if (granularity === 'quarter') return shiftMonth(getMonthKey(anchorDate), direction * 3)

  const target = parseLocalDate(anchorDate)
  target.setFullYear(target.getFullYear() + direction)
  return formatLocalDate(target)
}

function isDateInRange(date: string, range: WeeklyRange) {
  return Boolean(date && date >= range.startDate && date <= range.endDate)
}

function getUpcomingDueItems(items: LifeItem[], startDate: string, days: number) {
  const endDate = addDays(startDate, days)

  return items
    .filter(
      (item) =>
        item.status !== 'done' &&
        Boolean(item.dueDate) &&
        item.dueDate >= startDate &&
        item.dueDate <= endDate,
    )
    .sort(compareWorkItems)
}

function addDays(date: string, days: number) {
  const nextDate = parseLocalDate(date)
  nextDate.setDate(nextDate.getDate() + days)
  return formatLocalDate(nextDate)
}

function getProjectManagementBranches(items: LifeItem[]): ProjectManagementOutcome[] {
  const outcomes = items
    .filter((item) => item.layer === 'outcome' && item.status === 'active')
    .sort(compareWorkItems)
  const projects = items
    .filter((item) => item.layer === 'project' && item.status === 'active')
    .sort(compareWorkItems)
  const actions = items.filter((item) => item.layer === 'action').sort(compareWorkItems)

  return outcomes.map((outcome) => ({
    outcome,
    projects: projects
      .filter((project) => project.parentIds.includes(outcome.id))
      .map((project) => ({
        project,
        actions: actions.filter((action) => action.parentIds.includes(project.id)),
      })),
  }))
}

function getNextActions(items: LifeItem[], limit = Number.POSITIVE_INFINITY) {
  return items
    .filter((item) => item.layer === 'action' && item.status !== 'done')
    .sort(compareNextActions)
    .slice(0, limit)
}

function compareNextActions(left: LifeItem, right: LifeItem) {
  const today = currentDate()
  const upcomingEnd = addDays(today, 7)
  const leftTimeRank = nextActionTimeRank(left, today, upcomingEnd)
  const rightTimeRank = nextActionTimeRank(right, today, upcomingEnd)

  if (leftTimeRank !== rightTimeRank) return leftTimeRank - rightTimeRank

  const statusCompared = statusRank(left.status) - statusRank(right.status)
  if (statusCompared !== 0) return statusCompared

  if (!left.dueDate && right.dueDate) return 1
  if (left.dueDate && !right.dueDate) return -1
  if (left.dueDate && right.dueDate) {
    const dueCompared = left.dueDate.localeCompare(right.dueDate)
    if (dueCompared !== 0) return dueCompared
  }

  const updatedCompared = right.updatedDate.localeCompare(left.updatedDate)
  if (updatedCompared !== 0) return updatedCompared

  return left.title.localeCompare(right.title, 'zh-Hant')
}

function nextActionTimeRank(item: LifeItem, today: string, upcomingEnd: string) {
  if (!item.dueDate) return 3
  if (item.dueDate < today) return 0
  if (item.dueDate === today) return 1
  if (item.dueDate <= upcomingEnd) return 2
  return 3
}

function compareWorkItems(left: LifeItem, right: LifeItem) {
  if (!left.dueDate && !right.dueDate) {
    return right.updatedDate.localeCompare(left.updatedDate) || left.title.localeCompare(right.title, 'zh-Hant')
  }
  if (!left.dueDate) return 1
  if (!right.dueDate) return -1

  const compared = left.dueDate.localeCompare(right.dueDate)
  return compared === 0 ? left.title.localeCompare(right.title, 'zh-Hant') : compared
}

function toggleListValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((current) => current !== value) : [...values, value]
}

function formatDueDateLabel(item: LifeItem) {
  return item.dueDate ? `應完成 ${item.dueDate}` : '未設定應完成日'
}

function dueCountdownText(item: LifeItem) {
  if (item.status === 'done') return item.completedDate ? `完成 ${item.completedDate}` : '已完成'
  if (!item.dueDate) return '未設定'

  const days = daysBetween(currentDate(), item.dueDate)
  if (days < 0) return `逾期 ${Math.abs(days)} 天`
  if (days === 0) return '今日應完成'
  return `剩 ${days} 天`
}

function dueCountdownTone(item: LifeItem) {
  if (item.status === 'done') return 'done'
  if (!item.dueDate) return 'empty'
  if (item.dueDate < currentDate()) return 'late'
  if (item.dueDate === currentDate()) return 'today'
  return 'upcoming'
}

function getCalendarRiskTone(item: LifeItem): CalendarRiskTone {
  const today = currentDate()

  if (item.status === 'done') return 'done'
  if (item.deadlineDate && item.dueDate && item.deadlineDate < item.dueDate) return 'deadline-risk'
  if (item.deadlineDate && item.deadlineDate < today) return 'late'
  if (item.dueDate && item.dueDate < today && item.deadlineDate && item.deadlineDate >= today) return 'buffer'
  if (item.dueDate && item.dueDate < today) return 'late'
  if (item.deadlineDate && item.deadlineDate <= addDays(today, 7)) return 'deadline-risk'
  return 'normal'
}

function calendarRiskText(item: LifeItem) {
  const today = currentDate()

  if (item.status === 'done') return item.completedDate ? `完成 ${item.completedDate}` : '已完成'
  if (item.deadlineDate && item.dueDate && item.deadlineDate < item.dueDate) return '截止早於應完成'
  if (item.deadlineDate && item.deadlineDate < today) return '已超過截止'
  if (item.dueDate && item.dueDate < today && item.deadlineDate && item.deadlineDate >= today) {
    return `Buffer 中，距截止 ${daysBetween(today, item.deadlineDate)} 天`
  }
  if (item.dueDate && item.dueDate < today) return `逾期 ${Math.abs(daysBetween(today, item.dueDate))} 天`
  if (item.dueDate === today) return '今日應完成'
  if (item.dueDate && item.dueDate > today) return `距應完成 ${daysBetween(today, item.dueDate)} 天`
  if (item.deadlineDate) return `距截止 ${daysBetween(today, item.deadlineDate)} 天`
  return '尚未設定日期'
}

function getCalendarDetailMeta(item: LifeItem) {
  const parts = [calendarRiskText(item)]

  if (item.dueDate && item.deadlineDate && item.deadlineDate > item.dueDate) {
    parts.push(`Buffer ${daysBetween(item.dueDate, item.deadlineDate)} 天`)
  }
  if (item.dueDate && item.deadlineDate && item.deadlineDate < item.dueDate) {
    parts.push('請檢查日期設定')
  }

  return parts.join(' · ')
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
  return item.dueDate
}

function getCalendarRangeEntries(
  items: LifeItem[],
  layerFilters: Record<CalendarLayer, boolean>,
  month: string,
  statusFilter: CalendarStatusFilter,
) {
  const monthStart = month
  const monthEnd = getMonthEnd(month)
  const entries: CalendarRangeEntry[] = []

  items.forEach((item) => {
    if (!isCalendarLayer(item.layer) || !layerFilters[item.layer]) return
    if (!matchesCalendarStatusFilter(item, statusFilter)) return

    const range = getCalendarRange(item)
    if (!range) return

    const displayEndDate =
      item.deadlineDate && item.deadlineDate > range.endDate ? item.deadlineDate : range.endDate
    const hasVisibleRange = rangesOverlap(range.startDate, displayEndDate, monthStart, monthEnd)
    const hasVisibleDeadline = Boolean(
      item.deadlineDate && item.deadlineDate >= monthStart && item.deadlineDate <= monthEnd,
    )
    if (!hasVisibleRange && !hasVisibleDeadline) return

    entries.push({
      item,
      layer: item.layer,
      startDate: range.startDate,
      endDate: range.endDate,
    })
  })

  return entries.sort(compareCalendarRangeEntries)
}

function getTimelineRangeEntries<TLayer extends TimelineLayer>(
  items: LifeItem[],
  layerFilters: Record<TLayer, boolean>,
  layerIds: TLayer[],
  rangeStart: string,
  rangeEnd: string,
  statusFilter: CalendarStatusFilter,
) {
  const entries: CalendarRangeEntry[] = []

  items.forEach((item) => {
    if (!layerIds.includes(item.layer as TLayer)) return

    const layer = item.layer as TLayer
    if (!layerFilters[layer]) return
    if (!matchesCalendarStatusFilter(item, statusFilter)) return

    const range = getCalendarRange(item)
    if (!range) return

    const displayEndDate =
      item.deadlineDate && item.deadlineDate > range.endDate ? item.deadlineDate : range.endDate
    const hasVisibleRange = rangesOverlap(range.startDate, displayEndDate, rangeStart, rangeEnd)
    const hasVisibleDeadline = Boolean(
      item.deadlineDate && item.deadlineDate >= rangeStart && item.deadlineDate <= rangeEnd,
    )
    if (!hasVisibleRange && !hasVisibleDeadline) return

    entries.push({
      item,
      layer: item.layer as TimelineLayer,
      startDate: range.startDate,
      endDate: range.endDate,
    })
  })

  return entries.sort((left, right) => compareTimelineRangeEntries(left, right, layerIds))
}

function getUnscheduledTimelineItems<TLayer extends TimelineLayer>(
  items: LifeItem[],
  layerFilters: Record<TLayer, boolean>,
  layerIds: TLayer[],
  statusFilter: CalendarStatusFilter,
) {
  return items
    .filter((item) => {
      if (!layerIds.includes(item.layer as TLayer)) return false
      const layer = item.layer as TLayer
      return layerFilters[layer] && matchesCalendarStatusFilter(item, statusFilter) && !getCalendarRange(item)
    })
    .sort((left, right) => {
      const layerCompared = layerIds.indexOf(left.layer as TLayer) - layerIds.indexOf(right.layer as TLayer)
      if (layerCompared !== 0) return layerCompared
      return right.updatedDate.localeCompare(left.updatedDate) || left.title.localeCompare(right.title, 'zh-Hant')
    })
}

function matchesCalendarStatusFilter(item: LifeItem, filter: CalendarStatusFilter) {
  if (filter === 'all') return true
  if (filter === 'overdue') return isOverdue(item)
  if (filter === 'upcoming') {
    return (
      item.status !== 'done' &&
      Boolean(item.dueDate) &&
      item.dueDate >= currentDate() &&
      item.dueDate <= addDays(currentDate(), 7)
    )
  }

  return item.status === filter
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
  return compareTimelineRangeEntries(left, right, calendarLayerIds)
}

function compareTimelineRangeEntries(
  left: CalendarRangeEntry,
  right: CalendarRangeEntry,
  layerOrder: readonly TimelineLayer[],
) {
  const leftLayerIndex = layerOrder.indexOf(left.layer)
  const rightLayerIndex = layerOrder.indexOf(right.layer)
  const layerCompared =
    (leftLayerIndex === -1 ? timelineLayerIds.length : leftLayerIndex) -
    (rightLayerIndex === -1 ? timelineLayerIds.length : rightLayerIndex)
  if (layerCompared !== 0) return layerCompared

  const startCompared = left.startDate.localeCompare(right.startDate)
  if (startCompared !== 0) return startCompared

  const endCompared = left.endDate.localeCompare(right.endDate)
  if (endCompared !== 0) return endCompared

  const statusCompared = statusRank(left.item.status) - statusRank(right.item.status)
  if (statusCompared !== 0) return statusCompared

  return left.item.title.localeCompare(right.item.title, 'zh-Hant')
}

function statusRank(status: Status) {
  if (status === 'active') return 0
  if (status === 'not-started') return 1
  return 2
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
    let laneOffset = 0

    calendarLayerIds.forEach((layer) => {
      const laneEnds: string[] = []
      const weekEntries = entries
        .filter(
          (entry) =>
            entry.layer === layer &&
            rangesOverlap(entry.startDate, entry.endDate, week.startDate, week.endDate),
        )
        .sort(compareCalendarRangeEntries)

      weekEntries.forEach((entry) => {
        const segmentStart = maxDate(entry.startDate, week.startDate)
        const segmentEnd = minDate(entry.endDate, week.endDate)
        const reusableLane = laneEnds.findIndex((endDate) => endDate < segmentStart)
        const layerLane = reusableLane === -1 ? laneEnds.length : reusableLane

        laneEnds[layerLane] = segmentEnd
        segments.push({
          entry,
          weekIndex,
          startColumn: daysBetween(week.startDate, segmentStart) + 1,
          endColumn: daysBetween(week.startDate, segmentEnd) + 1,
          lane: laneOffset + layerLane,
          continuesBefore: entry.startDate < segmentStart,
          continuesAfter: entry.endDate > segmentEnd,
        })
      })

      laneOffset += Math.max(laneEnds.length, weekEntries.length > 0 ? 1 : 0)
    })
  })

  return segments
}

function buildCalendarDeadlineSegments(
  entries: CalendarRangeEntry[],
  weeks: CalendarWeek[],
  segments: CalendarBarSegment[],
) {
  const deadlineSegments: CalendarDeadlineSegment[] = []

  entries.forEach((entry) => {
    const { item } = entry
    if (!item.dueDate || !item.deadlineDate || item.deadlineDate <= item.dueDate) return

    weeks.forEach((week, weekIndex) => {
      if (!rangesOverlap(item.dueDate, item.deadlineDate, week.startDate, week.endDate)) return

      const matchingSegment = segments.find(
        (segment) => segment.entry.item.id === item.id && segment.weekIndex === weekIndex,
      )
      const fallbackSegment = segments.find((segment) => segment.entry.item.id === item.id)
      const segmentStart = maxDate(item.dueDate, week.startDate)
      const segmentEnd = minDate(item.deadlineDate, week.endDate)

      deadlineSegments.push({
        entry,
        weekIndex,
        startColumn: daysBetween(week.startDate, segmentStart) + 1,
        endColumn: daysBetween(week.startDate, segmentEnd) + 1,
        lane: matchingSegment?.lane ?? fallbackSegment?.lane ?? 0,
      })
    })
  })

  return deadlineSegments
}

function buildCalendarDeadlineFlags(
  entries: CalendarRangeEntry[],
  weeks: CalendarWeek[],
  segments: CalendarBarSegment[],
) {
  const flags: CalendarDeadlineFlag[] = []

  entries.forEach((entry) => {
    if (!entry.item.deadlineDate) return

    weeks.forEach((week, weekIndex) => {
      if (entry.item.deadlineDate < week.startDate || entry.item.deadlineDate > week.endDate) return

      const matchingSegment = segments.find(
        (segment) => segment.entry.item.id === entry.item.id && segment.weekIndex === weekIndex,
      )

      flags.push({
        entry,
        weekIndex,
        column: daysBetween(week.startDate, entry.item.deadlineDate) + 1,
        lane: matchingSegment?.lane ?? 0,
        tone: getCalendarRiskTone(entry.item),
        label: `${entry.item.title} 截止日期 ${entry.item.deadlineDate}`,
      })
    })
  })

  return flags
}

function buildTimelineSegments<TLayer extends TimelineLayer>(
  entries: CalendarRangeEntry[],
  columns: TimelineColumn[],
  layerOrder: TLayer[],
) {
  const segments: TimelineSegment[] = []
  const rangeStart = columns[0]?.startDate
  const rangeEnd = columns[columns.length - 1]?.endDate
  if (!rangeStart || !rangeEnd) return segments
  let laneOffset = 0

  layerOrder.forEach((layer) => {
    const laneEnds: string[] = []
    const layerEntries = entries
      .filter(
        (entry) =>
          entry.layer === layer &&
          rangesOverlap(entry.startDate, entry.endDate, rangeStart, rangeEnd),
      )
      .sort((left, right) => compareTimelineRangeEntries(left, right, layerOrder))

    layerEntries.forEach((entry) => {
      const segmentStart = maxDate(entry.startDate, rangeStart)
      const segmentEnd = minDate(entry.endDate, rangeEnd)
      const startIndex = columns.findIndex((column) => column.endDate >= segmentStart)
      const endIndex = findLastIndex(columns, (column) => column.startDate <= segmentEnd)
      if (startIndex === -1 || endIndex === -1) return

      const reusableLane = laneEnds.findIndex((endDate) => endDate < segmentStart)
      const layerLane = reusableLane === -1 ? laneEnds.length : reusableLane

      laneEnds[layerLane] = segmentEnd
      segments.push({
        entry,
        startColumn: startIndex + 1,
        endColumn: endIndex + 1,
        lane: laneOffset + layerLane,
        continuesBefore: entry.startDate < segmentStart,
        continuesAfter: entry.endDate > segmentEnd,
      })
    })

    laneOffset += Math.max(laneEnds.length, layerEntries.length > 0 ? 1 : 0)
  })

  return segments
}

function buildTimelineLayerBands<TLayer extends TimelineLayer>(
  entries: CalendarRangeEntry[],
  columns: TimelineColumn[],
  layerOrder: TLayer[],
) {
  const bands: TimelineLayerBand[] = []
  const rangeStart = columns[0]?.startDate
  const rangeEnd = columns[columns.length - 1]?.endDate
  if (!rangeStart || !rangeEnd) return bands
  let laneOffset = 0

  layerOrder.forEach((layer) => {
    const layerEntries = entries
      .filter(
        (entry) =>
          entry.layer === layer &&
          rangesOverlap(entry.startDate, entry.endDate, rangeStart, rangeEnd),
      )
      .sort((left, right) => compareTimelineRangeEntries(left, right, layerOrder))
    const laneCount = countLayerLanes(layerEntries)

    if (laneCount > 0) {
      bands.push({
        layer,
        startLane: laneOffset,
        laneCount,
      })
    }

    laneOffset += laneCount
  })

  return bands
}

function countLayerLanes(entries: CalendarRangeEntry[]) {
  const laneEnds: string[] = []

  entries.forEach((entry) => {
    const reusableLane = laneEnds.findIndex((endDate) => endDate < entry.startDate)
    const lane = reusableLane === -1 ? laneEnds.length : reusableLane
    laneEnds[lane] = entry.endDate
  })

  return laneEnds.length
}

function getRollingRange(startDate: string, days: number): WeeklyRange {
  return {
    startDate,
    endDate: addDays(startDate, days),
  }
}

function getRollingWeekColumns(startDate: string): TimelineColumn[] {
  const today = currentDate()

  return Array.from({ length: 13 }, (_, index) => {
    const weekStart = addDays(startDate, index * 7)
    const weekEnd = addDays(weekStart, 6)

    return {
      id: weekStart,
      label: `第 ${index + 1} 週`,
      sublabel: `${weekStart.slice(5)} - ${weekEnd.slice(5)}`,
      startDate: weekStart,
      endDate: weekEnd,
      isCurrent: today >= weekStart && today <= weekEnd,
    }
  })
}

function getHorizonRange(startMonth: string): WeeklyRange {
  return {
    startDate: startMonth,
    endDate: getMonthEnd(shiftMonth(startMonth, 35)),
  }
}

function getHorizonMonthColumns(startMonth: string): TimelineColumn[] {
  const today = currentDate()

  return Array.from({ length: 36 }, (_, index) => {
    const month = shiftMonth(startMonth, index)

    return {
      id: month,
      label: month.slice(0, 4),
      sublabel: `${Number(month.slice(5, 7))}月`,
      startDate: month,
      endDate: getMonthEnd(month),
      isCurrent: today >= month && today <= getMonthEnd(month),
    }
  })
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

function getYearStartMonth(date: string) {
  return `${date.slice(0, 4)}-01-01`
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

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) return index
  }

  return -1
}

function daysBetween(startDate: string, endDate: string) {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

function matchesDateFilter(item: LifeItem, filter: DateFilter) {
  if (filter === 'all') return true
  if (filter === 'done') return item.status === 'done'
  if (filter === 'unscheduled') return !hasDueDate(item)
  if (filter === 'overdue') return isOverdue(item)
  if (filter === 'today') return isToday(getDueDate(item))
  if (filter === 'this-week') return isThisWeek(getDueDate(item))
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
    item.dueDate ? `應完成 ${item.dueDate}` : '',
    item.deadlineDate ? `截止 ${item.deadlineDate}` : '',
    item.completedDate ? `完成 ${item.completedDate}` : '',
  ].filter(Boolean)
  return parts.join(' · ')
}

function getDueDate(item: LifeItem) {
  return item.dueDate
}

function hasDueDate(item: LifeItem) {
  return Boolean(getDueDate(item))
}

function isOverdue(item: LifeItem) {
  const date = getDueDate(item)
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
