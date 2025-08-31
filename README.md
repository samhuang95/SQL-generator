# SQL Generator - Chrome Extension

> 批量生成 SQL INSERT & UPDATE 語句的 Chrome 擴充功能

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-green.svg)](https://chrome.google.com/webstore)

## 📋 功能特色

- ✅ **批量SQL生成**: 從資料快速生成大量 INSERT 和 UPDATE 語句
- ✅ **多種輸入方式**: 支援手動輸入、CSV 匯入、JSON 匯入
- ✅ **跨資料庫支援**: MySQL, PostgreSQL, SQLite, SQL Server
- ✅ **安全防護**: SQL 注入防護和輸入驗證
- ✅ **智慧型驗證**: 自動資料類型推斷和語法檢查
- ✅ **使用者友善**: 直覺的介面設計和即時預覽

## 🚀 快速開始

### 安裝需求

- Node.js 16.0.0 或以上版本
- npm 8.0.0 或以上版本
- Chrome 瀏覽器 88 或以上版本

### 開發環境設定

1. **複製專案**
```bash
git clone https://github.com/sqlgenerator/chrome-extension.git
cd SQL-generator
```

2. **安裝依賴**
```bash
npm install
```

3. **開發模式**
```bash
npm run dev
```

4. **建置生產版本**
```bash
npm run build
```

5. **載入到 Chrome**
   - 開啟 Chrome 瀏覽器
   - 前往 `chrome://extensions/`
   - 開啟「開發者模式」
   - 點擊「載入未封裝項目」
   - 選擇專案資料夾

## 📖 使用說明

### 基本操作

1. **手動輸入資料**
   - 設定表名和資料庫類型
   - 定義欄位名稱和資料類型
   - 輸入資料列
   - 點擊「生成SQL」

2. **CSV 匯入**
   - 點擊「CSV匯入」標籤
   - 上傳或拖放 CSV 檔案
   - 確認預覽資料
   - 生成 SQL 語句

3. **JSON 匯入**
   - 點擊「JSON匯入」標籤
   - 貼上 JSON 陣列資料
   - 點擊「解析JSON」
   - 生成 SQL 語句

### 進階功能

- **右鍵選單**: 在網頁上右鍵可快速檢測表格或解析選取的資料
- **歷史記錄**: 自動儲存生成的 SQL 查詢歷史
- **一鍵複製**: 複製生成的 SQL 到剪貼簿
- **檔案下載**: 下載 SQL 檔案到本機

## 🛠️ 開發指令

```bash
# 開發模式 (監聽檔案變更)
npm run dev

# 建置生產版本
npm run build

# 執行測試
npm test

# 程式碼檢查
npm run lint

# 自動修復程式碼風格
npm run lint:fix

# 格式化程式碼
npm run format

# 清理建置檔案
npm run clean

# 打包擴充功能
npm run zip

# 執行開發伺服器
npm run serve
```

## 📁 專案結構

```
SQL-generator/
├── manifest.json          # Chrome 擴充功能設定檔
├── popup.html             # 彈出視窗 HTML
├── popup.js               # 彈出視窗邏輯
├── background.js          # 背景服務腳本
├── content.js             # 內容腳本
├── package.json           # 專案設定和依賴
├── webpack.config.js      # Webpack 建置設定
├── css/
│   └── popup.css         # 樣式檔案
├── icons/                # 擴充功能圖示
├── specs/                # 專案規格文件
│   └── sql-generator/
│       ├── requirements.md # 需求規格
│       ├── design.md      # 技術設計
│       └── tasks.md       # 任務清單
└── dist/                 # 建置輸出 (自動生成)
```

## 🔧 技術架構

### 核心技術
- **Chrome Extension Manifest V3**
- **Vanilla JavaScript** (ES6+)
- **CSS3** 響應式設計
- **Webpack** 建置工具

### 主要組件
- **SQL 生成引擎**: 核心 SQL 語句生成邏輯
- **資料庫方言處理器**: 支援多種資料庫語法
- **資料匯入處理器**: CSV/JSON 解析和處理
- **安全驗證器**: SQL 注入防護和輸入驗證
- **儲存管理器**: Chrome Storage API 整合

## 🔒 安全性

- **SQL 注入防護**: 自動轉義特殊字元和驗證輸入
- **內容安全政策**: 嚴格的 CSP 設定防止 XSS 攻擊
- **權限最小化**: 僅請求必要的瀏覽器權限
- **資料隔離**: 不會儲存敏感資料到雲端

## 🧪 測試

```bash
# 執行所有測試
npm test

# 執行測試並產生覆蓋率報告
npm test -- --coverage

# 監聽模式執行測試
npm test -- --watch
```

測試覆蓋率目標：80%

## 🤝 貢獻指南

1. Fork 此專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 程式碼風格

- 使用 ESLint 和 Prettier 進行程式碼格式化
- 遵循 JavaScript ES6+ 標準
- 變數和函數使用 camelCase 命名
- 常數使用 UPPER_SNAKE_CASE 命名

## 📝 更新日誌

### v1.0.0 (開發中)
- ✅ 基本 INSERT/UPDATE SQL 生成
- ✅ 手動資料輸入功能
- ✅ CSV 和 JSON 匯入
- ✅ MySQL 和 PostgreSQL 支援
- ✅ 基礎安全驗證
- 🔄 Chrome 擴充功能整合

## 📄 授權條款

本專案使用 [MIT License](LICENSE) 授權條款。

## 👥 開發團隊

- **主要開發者**: SQL Generator Team
- **聯絡信箱**: support@sqlgenerator.com

## 🆘 問題回報

如果您遇到問題或有功能建議，請：

1. 檢查 [Issues](https://github.com/sqlgenerator/chrome-extension/issues) 是否已有相關討論
2. 建立新的 Issue 並提供詳細描述
3. 包含錯誤訊息和重現步驟

## 🔗 相關連結

- [Chrome Web Store 頁面](https://chrome.google.com/webstore)
- [使用說明文件](https://github.com/sqlgenerator/chrome-extension/wiki)
- [問題追蹤](https://github.com/sqlgenerator/chrome-extension/issues)
- [功能請求](https://github.com/sqlgenerator/chrome-extension/discussions)

---

**⭐ 如果這個專案對您有幫助，請給我們一個星星！**
This is a generator of SQL code.
