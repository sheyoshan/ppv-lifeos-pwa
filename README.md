# PPV Life OS PWA

原則驅動的七層人生管理系統原型，使用 React + Vite + TypeScript 製作，可部署到 GitHub Pages，並以 PWA 方式加入 iPhone 主畫面。

## 功能

- 建立七層 PPV 物件：原則、支柱、目的、目標、結果、專案、行動
- 每個下層物件只連結一個父層，保持專注與清楚對齊
- 從任一物件查看往上的對齊路徑
- 行動清單可標記完成
- 本機瀏覽器儲存資料
- JSON 匯出與匯入，方便保存到 iPhone「檔案」
- Service worker 快取 App shell，支援離線再次開啟

## 開發

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build
```

## 部署到 GitHub Pages

1. 將此專案推到 GitHub repository。
2. 到 repository 的 Settings > Pages。
3. Source 選擇 GitHub Actions。
4. 推送到 `main` 後，`.github/workflows/deploy.yml` 會自動建置並部署。

## iPhone 使用

1. 用 Safari 開啟 GitHub Pages 網址。
2. 點分享按鈕。
3. 選擇「加入主畫面」。
4. 從主畫面開啟 Life OS。

資料主要保存在該裝置的瀏覽器本機空間。若要備份或移轉，請在「資料」頁匯出 JSON。
