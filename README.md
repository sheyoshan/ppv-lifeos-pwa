# PPV Life OS PWA

PPV Life OS PWA 是一套「原則驅動的七層人生管理系統」，使用 React、Vite、TypeScript 製作，資料保存在瀏覽器本機端，可部署到 GitHub Pages，並以 PWA 方式加入 iPhone 主畫面。

這個專案的重點不是把待辦事項排得更滿，而是把人生價值、長期方向、具體目標、可交付結果、專案工作與每日行動連接起來。它讓使用者能回答一個很實際的問題：今天做的下一步，是否真的服務我相信的原則與重視的人生支柱？

## 這是什麼

PPV Life OS 是一個單頁 PWA，提供五個主要頁籤：

- `首頁`：聚焦今日行動、進行中專案、未連結物件，以及最重要的進行中結果。
- `架構`：瀏覽七層 PPV 物件，篩選、排序、查看源頭關係，並新增或編輯物件。
- `行動`：集中處理最底層的下一步行動，支援快速標記完成。
- `月曆`：以月視圖橫條顯示行動、專案、結果從開始日期到應完成日的計畫跨度。
- `資料`：匯出/匯入 JSON、本機資料狀態，以及內建 PPV Life OS 百科全書。

目前版本沒有後端、帳號、雲端同步、提醒、推播或外部行事曆整合。所有核心資料都保存在目前裝置與瀏覽器的 `localStorage`。

## 系統理念：Principles → Actions

PPV Life OS 的核心是七層結構：

```text
Principles 原則
  -> Pillars 支柱
    -> Purposes 目的
      -> Goals 目標
        -> Outcomes 結果
          -> Projects 專案
            -> Actions 行動
```

這套系統有兩個方向：

- 由上而下建立對齊：用原則決定方向，用支柱維持平衡，用目的確認意義。
- 由下而上檢查現實：用行動、專案與結果檢查每天做的事是否真的推進重要目標。

它不是 GTD 的替代品，而是補上 GTD 比較少處理的「為什麼值得做」。GTD 擅長處理捕捉、釐清、組織、回顧與執行；PPV 則讓每個被處理的承諾能回到價值、目的與人生支柱。

## 七層架構

### 原則 Principles

原則是最高判斷標準，代表使用者相信什麼、什麼不可長期違背。好的原則能在衝突時幫助取捨。

例：

- 不以長期健康交換短期績效。
- 家庭關係不能成為事業成長的燃料。

### 支柱 Pillars

支柱是人生長期承重領域，例如健康、家庭、事業、財務、學習、孩子教育。支柱不是任務分類，而是平衡結構。

### 目的 Purposes

目的說明每個支柱為什麼重要，避免目標變成外界標準。例如財務支柱的目的可能不是「看起來成功」，而是「建立選擇自由，讓家庭在變動時有安全邊界」。

### 目標 Goals

目標是在某個目的下想前進的方向。它比目的更具體，比結果更長期。目標通常可以產生多個結果。

### 結果 Outcomes

結果是可觀察、可交付、可驗收的成果，用來判斷目標是否真的有進展。首頁會特別顯示進行中的結果，提醒目前最該交付的成果。

### 專案 Projects

專案是為了創造結果而需要完成的一組工作。專案通常包含多個行動，並且應該有明確完成條件。

### 行動 Actions

行動是今天或本週可以直接執行的下一步。它必須具體到可以開始，而不是模糊願望。

## 功能總覽

### 首頁

首頁保留快速判斷用的資訊：

- 今日焦點：目前最前面的未完成行動。
- 指標卡片：待執行行動、進行中專案、未連結物件。
- 進行中的結果：最多顯示 5 個 `outcome` 且狀態為 `active` 的結果。
- 本週對齊：以週一到週日為回顧週期，檢查本週完成、逾期、即將到期與 Alignment 斷點。

點擊首頁的結果卡片會切到 `架構` 頁，並開啟該結果的源頭關係視圖。

「本週對齊」不是靜態報表，而是首頁內的週回顧工作台。它會列出行動未連專案、專案未連結果、結果未連目標、進行中結果沒有進行中專案、進行中專案沒有進行中行動、已完成父層仍有未完成子層、逾期未完成，以及截止日期接近但沒有下一步的專案。每個斷點都可以直接查看關係、編輯，或建立缺少的專案/行動。

### 架構

架構頁是系統核心：

- 使用七層 segmented control 切換目前層級。
- 每個層級有自己的搜尋、狀態篩選、日期篩選、連結篩選與排序設定。
- 篩選與排序偏好保存在 `localStorage`，不進 JSON 匯出。
- 點選物件後，右側優先顯示「源頭關係」而不是直接編輯。
- 可從源頭關係視圖切換到編輯表單。
- 父層支援多選，也允許沒有父層。

關係視圖會往上追溯所有 `parentIds`。如果匯入資料中有遺失父層或循環連結，UI 會用防護節點顯示，不讓遞迴卡死。

### 行動

行動頁集中顯示所有 `action` 物件：

- 可快速標記完成或改回進行中。
- 完成時會自動補上完成日期。
- 可進入表單編輯行動的名稱、說明、父層、狀態與日期。

### 月曆

月曆頁現在是「時間視圖中心」，不只是一個月格子：

- `月視圖`：顯示 `action`、`project`、`outcome`，用於本月執行與交付壓力。
- `季度路線圖`：顯示 `goal`、`outcome`、`project`，採用從本週開始的滾動 13 週，適合檢查目標是否有結果與專案支撐。
- `長期視圖`：顯示 `purpose`、`goal`，採用 36 個月跨度，適合檢查目的與目標是否仍在同一個長期方向上。

三種視圖都使用 `startDate` 到 `dueDate` 顯示期間橫條。若只有其中一個日期，顯示為單日橫條；若日期順序反向，只在顯示層使用較早日期到較晚日期，不修改原始資料。點擊橫條會在下方打開詳情面板，可查看日期、倒數、連結數、buffer 狀態，並可再選擇查看關係或編輯。

注意：`deadlineDate` 是截止日期，用來表示絕對不能晚於此日的死線。在月視圖中，若 `deadlineDate` 晚於 `dueDate`，會用虛線 buffer 顯示應完成日到截止日之間的緩衝區，並在截止日顯示旗標。若截止日早於應完成日，UI 會顯示高風險提示，但不修改原始資料。

### 資料

資料頁包含：

- JSON 匯出與匯入。
- 本機資料狀態。
- PPV Life OS 百科全書。

百科全書是靜態內建內容，不會寫入 `localStorage`，也不會進 JSON 匯出。它提供系統總覽、七大層次、GTD 關係、規劃流程、Alignment、日期節奏、週回顧與實作範例。

## 使用方法

### 1. 建立最小可用系統

第一次使用時，不需要把人生所有領域一次填滿。建議先建立一條完整鏈路：

```text
原則 -> 支柱 -> 目的 -> 目標 -> 結果 -> 專案 -> 行動
```

例：

```text
原則：不以長期健康交換短期績效
支柱：健康
目的：保有陪伴家人與長期創造的身體能力
目標：建立穩定睡眠與基本體能
結果：連續 30 天 23:30 前上床
專案：設計晚間關機流程
行動：今晚 22:45 關閉工作通知
```

### 2. 每日使用

每天打開 app 時：

1. 看首頁的進行中結果，確認目前最重要的交付成果。
2. 看「本週對齊」是否有逾期、未連結或無下一步的斷點。
3. 看今日焦點或行動頁，選出今天要推進的下一步。
4. 完成行動後標記完成。
5. 如果出現新的承諾，先建立行動或專案，之後在週回顧補上連結。

### 3. 每週回顧

每週建議檢查：

- 哪些行動完成了？
- 哪些專案沒有下一步？
- 哪些進行中結果沒有專案推進？
- 哪些物件沒有父層？它是暫時探索，還是需要連回上層？
- 日期是否仍合理？
- 有哪些結果應該完成、延後、拆小或刪除？

首頁的「本週對齊」以本機時間的週一到週日作為本週範圍。本週完成行動看 `completedDate`，逾期與即將到期看 `dueDate`，硬截止風險看 `deadlineDate`。

### 4. 每月與每季回顧

每月看目標與支柱：

- 目前最重要的目標有哪些實際結果？
- 哪個支柱長期沒有任何專案？
- 哪個支柱吸走過多行動？

每季回到目的與原則：

- 目前方向是否仍符合原則？
- 某些目標是否只是外界標準？
- 是否有重要支柱被長期犧牲？

### 5. 備份與移轉

資料只存在目前瀏覽器本機空間。若要備份：

1. 到 `資料` 頁。
2. 點 `匯出 JSON`。
3. 將檔案保存到 iPhone「檔案」、iCloud Drive 或其他安全位置。

移轉或還原時：

1. 到 `資料` 頁。
2. 點 `匯入 JSON`。
3. 選擇先前匯出的檔案。

匯入會以檔案內容取代目前物件資料。匯入前建議先匯出一次目前資料作備份。

## 資料模型與 JSON 備份

主要資料保存在：

- `ppv-lifeos-data-v1`：使用者建立的 Life OS 物件。
- `ppv-lifeos-map-preferences-v1`：架構頁篩選與排序偏好。

匯出的 JSON 只包含主要物件資料，不包含 UI 偏好。

### LifeData

```json
{
  "version": 3,
  "exportedAt": "2026-06-24T10:00:00.000Z",
  "items": []
}
```

### LifeItem

```json
{
  "id": "item-001",
  "layer": "outcome",
  "title": "完成家庭現金流儀表板",
  "note": "讓家庭固定收入、支出與儲蓄率可以被每月追蹤。",
  "parentIds": ["goal-001", "goal-002"],
  "status": "active",
  "createdDate": "2026-06-01",
  "updatedDate": "2026-06-24",
  "startDate": "2026-06-10",
  "completedDate": "",
  "dueDate": "2026-06-20",
  "deadlineDate": "2026-06-30"
}
```

欄位說明：

- `id`：物件唯一識別碼，由 app 建立。
- `layer`：七層之一，允許值為 `principle`、`pillar`、`purpose`、`goal`、`outcome`、`project`、`action`。
- `title`：物件名稱。
- `note`：說明文字。
- `parentIds`：父層物件 ID 陣列，支援多父層，也允許空陣列。
- `status`：`not-started`、`active`、`done`。
- `createdDate`：建立日期，格式 `YYYY-MM-DD`。
- `updatedDate`：修改日期，格式 `YYYY-MM-DD`。
- `startDate`：開始日期，月曆橫條的起點。
- `completedDate`：完成日期。
- `dueDate`：應完成日，也就是專案管理中的預計完成日期；月曆橫條的終點，也用於日期篩選與排序。
- `deadlineDate`：截止日期，也就是絕對不能晚於此日的死線，用於摘要與排序。

### 日期規則

所有日期欄位使用 `YYYY-MM-DD`。空字串代表未設定日期。

目前不同功能對日期的使用方式如下：

- 架構頁日期篩選：以 `dueDate` 應完成日判斷逾期、今天、本週。
- 首頁進行中結果排序：優先看 `dueDate` 應完成日。
- 月曆時間視圖：使用 `startDate` 到 `dueDate` 應完成日顯示行動、專案、結果、目標與目的的計畫跨度。
- 截止日期：`deadlineDate` 作為截止資訊、buffer 視覺與摘要顯示，不取代 `dueDate` 作為主要計畫終點。
- 完成行動或物件：若狀態改為 `done` 且沒有 `completedDate`，會補上當日日期。

### 資料版本與舊格式

目前正式資料格式是 `version: 3`。這是破壞性 schema 更新，不再支援舊版 `scheduledDate` 欄位。

匯入或載入時會過濾不符合新版格式的物件：

- 含有舊 `scheduledDate` 的物件會被視為無效。
- 缺少 `deadlineDate` 的物件會被視為無效。
- `parentIds` 必須是陣列，不再從舊 `parentId` 自動轉換。
- 舊版 `createdAt`、`updatedAt` 不再自動轉換。
- 日期仍會正規化為 `YYYY-MM-DD` 或空字串，但欄位本身必須存在。

## 工程架構

技術棧：

- React 19
- Vite 8
- TypeScript 6
- ESLint 10
- GitHub Pages
- 原生 Service Worker
- 瀏覽器 `localStorage`

主要檔案：

- `src/App.tsx`：核心型別、狀態、資料 normalization、頁籤 UI、百科內容、月曆與關係推導。
- `src/App.css`：主要 layout、卡片、表單、架構頁、月曆、百科、底部導覽樣式。
- `src/index.css`：全域色票、深色模式、基礎 typography。
- `src/main.tsx`：React entry point。
- `public/manifest.webmanifest`：PWA manifest。
- `public/sw.js`：service worker cache 與離線 fallback。
- `.github/workflows/deploy.yml`：GitHub Pages build/deploy workflow。
- `vite.config.ts`：Vite 設定，`base: './'` 讓 GitHub Pages repo path 下的 assets 能正常載入。

目前 app 採單檔狀態管理，不使用 Redux、router 或後端 API。這讓原型維護簡單，但也代表 `src/App.tsx` 會承擔較多產品邏輯。

## 開發與調試

### 安裝

```bash
npm install
```

### 本機開發

```bash
npm run dev
```

Vite 預設會啟動本機開發伺服器。若在某些沙盒環境出現 `listen EPERM`，通常是環境限制本機 port 綁定，不代表程式本身錯誤。

### 靜態檢查

```bash
npm run lint
```

### 建置

```bash
npm run build
```

這個指令會先執行 TypeScript build，再執行 Vite production build。部署 workflow 也使用這個指令。

### 預覽 production build

```bash
npm run preview
```

### 常見調試

#### GitHub Pages 顯示 404

檢查：

- Repository `Settings > Pages` 是否啟用。
- Source 是否選擇 `GitHub Actions`。
- 最新 Actions run 是否成功。
- `.github/workflows/deploy.yml` 是否有 `pages: write` 與 `id-token: write` 權限。

#### GitHub Actions 部署失敗

檢查：

- `npm ci` 是否能安裝相依套件。
- `npm run build` 是否在本機通過。
- Pages 是否已啟用。
- Workflow 是否在 `main` push 後觸發。

#### iPhone PWA 卡在舊版

此專案使用 `public/sw.js` 快取 app shell。若 UI 或主要靜態內容更新後 iPhone 仍顯示舊版：

1. 確認 `public/sw.js` 的 `CACHE_NAME` 已升版，例如 `ppv-lifeos-v6` 改為下一版。
2. 確認 GitHub Pages deploy 成功。
3. 在 iPhone 關閉 PWA 後重新開啟。
4. 必要時用 Safari 開一次網站，再重新加入主畫面。

#### JSON 匯入失敗

可能原因：

- 檔案不是合法 JSON。
- JSON 中沒有 `items` 陣列。
- 物件缺少必要欄位，例如 `id`、`layer`、`title`。
- `layer` 不是七層允許值。

匯入前建議先匯出目前資料作為備份。

#### localStorage 資料不見

資料只存在目前瀏覽器環境。以下情況可能讓資料消失：

- 清除 Safari/瀏覽器網站資料。
- 使用不同瀏覽器或不同裝置。
- 私密瀏覽或系統清理本機資料。
- 重新部署不會刪資料，但若更換網域或路徑，localStorage 會是另一份。

## 部署到 GitHub Pages

此 repo 已包含 GitHub Actions workflow：

```yaml
name: Deploy PWA to GitHub Pages
```

部署流程：

1. push 到 `main`。
2. GitHub Actions 使用 Node 22。
3. 執行 `npm ci`。
4. 執行 `npm run build`。
5. 上傳 `dist` artifact。
6. 使用 `actions/deploy-pages@v5` 部署到 GitHub Pages。

首次部署設定：

1. 到 GitHub repository。
2. 開啟 `Settings > Pages`。
3. Source 選擇 `GitHub Actions`。
4. 推送到 `main`。
5. 等待 Actions 完成。

目前 Pages URL：

```text
https://sheyoshan.github.io/ppv-lifeos-pwa/
```

## iPhone PWA 使用與更新

安裝：

1. 用 Safari 開啟 GitHub Pages URL。
2. 點分享按鈕。
3. 選擇「加入主畫面」。
4. 從主畫面開啟 `Life OS`。

使用注意：

- PWA 以 `standalone` 模式開啟。
- 資料保存在 iPhone Safari 對該網站的本機儲存空間。
- 更新版本後，如果畫面沒有刷新，先關閉 PWA 再重新開啟。
- 若更新仍未生效，檢查 service worker cache 版本是否已升版。

備份建議：

- 定期在 `資料` 頁匯出 JSON。
- 將 JSON 存到 iCloud Drive 或其他安全位置。
- 在重大資料整理前先匯出備份。

## 常見問題

### 可以有多個父層嗎？

可以。`parentIds` 是陣列，允許多父層。這適合一個專案同時服務多個結果，或一個結果同時服務多個目標。

### 可以沒有父層嗎？

可以。未連結不視為錯誤，而是保留彈性。臨時任務、探索想法、尚未歸類的承諾都可以先不連結。建議在週回顧時整理。

### 這套系統會同步到雲端嗎？

不會。目前沒有後端、帳號或雲端同步。資料只存在本機瀏覽器，請靠 JSON 匯出備份。

### 月曆會同步 Apple Calendar 或 Google Calendar 嗎？

不會。目前月曆是 app 內部視圖，用 `startDate` 與 `dueDate` 應完成日顯示行動、專案、結果的計畫期間，並用 `deadlineDate` 顯示 buffer 與截止旗標。

### 有提醒或 Web Push 嗎？

沒有。目前版本不包含提醒、推播、後端 API 或通知權限。

### 百科全書可以編輯嗎？

不行。百科全書是前端靜態內建內容，用來說明 PPV Life OS 的理念與實作方式，不屬於使用者資料。

## Roadmap / 非目標

### 可能的後續方向

- 週回顧歷史紀錄與完成確認流程。
- 匯入前預覽與合併策略。
- 更細緻的月曆視圖，例如週視圖或日期詳情。
- 更好的手機版大量資料瀏覽體驗。
- 物件搜尋跨層整合。
- README 拆分為更完整的 docs 目錄。

### 目前非目標

- 後端服務。
- 帳號系統。
- 雲端同步。
- Web Push 或提醒。
- Apple Calendar / Google Calendar 雙向同步。
- 多人協作。
- 百科全書線上編輯。

## 維護備註

修改 app 行為後，建議至少執行：

```bash
npm run lint
npm run build
```

若改到 PWA app shell、主要 UI 或靜態內容，並且希望 iPhone PWA 更穩定地載入新版，請同步更新 `public/sw.js` 的 `CACHE_NAME`。

若改到資料模型，請同時更新：

- `LifeItem` 型別。
- `normalizeItem`。
- JSON 匯出/匯入說明。
- README 的資料模型章節。
