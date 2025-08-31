# 🚀 SQL Generator Chrome 擴充功能安裝指南

## ✅ 修復完成的問題

### 已解決的錯誤：
1. **Service worker registration failed** - ✅ 已修復
2. **contextMenus API 錯誤** - ✅ 已加入權限和錯誤處理
3. **CSP 違規 (inline event handlers)** - ✅ 已移除所有 onclick 屬性
4. **權限不足** - ✅ 已加入必要權限

### 已加入的權限：
- `storage` - 儲存用戶資料和設定
- `activeTab` - 存取當前標籤頁
- `contextMenus` - 右鍵選單功能  
- `notifications` - 顯示通知
- `scripting` - 內容腳本注入

## 📥 安裝步驟

### 方法一：直接載入 (推薦開發測試)

1. **開啟 Chrome 瀏覽器**

2. **前往擴充功能頁面**
   ```
   chrome://extensions/
   ```

3. **開啟開發者模式**
   - 點擊右上角的「開發者模式」開關

4. **載入擴充功能**
   - 點擊「載入未封裝項目」
   - 選擇資料夾：`C:\Users\user\Desktop\SQL-generator`

5. **確認載入成功**
   - 應該看到 "SQL Generator - 批量SQL生成器" 出現在擴充功能清單中
   - 狀態應該顯示為「已啟用」

### 方法二：打包安裝

1. **打包擴充功能**
   ```bash
   cd C:\Users\user\Desktop\SQL-generator
   npm run zip
   ```

2. **載入 .zip 檔案**
   - 在 chrome://extensions/ 頁面
   - 將生成的 .zip 檔案拖放到頁面上

## 🧪 功能測試

### 基本功能測試：

1. **主介面測試**
   - 點擊瀏覽器工具列中的 SQL Generator 圖示
   - 應該看到彈出視窗顯示主介面

2. **右鍵選單測試**
   - 開啟任意網頁
   - 右鍵點擊應該看到 "SQL Generator" 選項

3. **手動資料輸入測試**
   - 輸入表名：`users`
   - 加入欄位：`id (INT)`, `name (VARCHAR)`, `email (VARCHAR)`
   - 加入資料列：`1, 張三, zhang@example.com`
   - 點擊「生成SQL」

4. **CSV匯入測試**
   - 使用提供的測試頁面：`test-functionality.html`
   - 複製CSV資料並測試匯入功能

### 預期結果：

**成功的 INSERT 語句範例：**
```sql
INSERT INTO `users` (`id`, `name`, `email`) VALUES (1, '張三', 'zhang@example.com');
```

## 🔧 故障排除

### 如果遇到問題：

1. **重新載入擴充功能**
   - 在 chrome://extensions/ 中點擊刷新按鈕

2. **檢查開發者控制台**
   - 按 F12 打開開發者工具
   - 查看 Console 標籤中的錯誤訊息

3. **檢查 Service Worker**
   - 在擴充功能詳細頁面點擊 "service worker" 連結
   - 查看是否有錯誤

4. **檢查權限**
   - 確認擴充功能已獲得所有必要權限
   - 重新安裝如果權限不足

### 常見問題：

**Q: 右鍵選單沒有出現 SQL Generator 選項**
A: 檢查是否開啟了 contextMenus 權限，重新載入擴充功能

**Q: 點擊圖示沒有反應**
A: 檢查 popup.html 和 popup.js 是否正確載入

**Q: CSV 檔案無法上傳**
A: 檢查瀏覽器是否允許檔案存取權限

## 🎉 成功指標

如果以下功能都正常運作，代表安裝成功：

- ✅ 擴充功能圖示出現在工具列
- ✅ 點擊圖示顯示主介面
- ✅ 可以手動輸入資料並生成SQL
- ✅ 右鍵選單有SQL Generator選項  
- ✅ CSV匯入功能正常
- ✅ 生成的SQL語法正確
- ✅ 可以複製生成的SQL到剪貼簿

## 📞 技術支援

如果遇到其他問題：
1. 檢查瀏覽器控制台的錯誤訊息
2. 確認 Chrome 版本 >= 88
3. 嘗試停用其他可能衝突的擴充功能
4. 重新載入頁面後再測試

---

**🎊 恭喜！SQL Generator Chrome 擴充功能已準備就緒！**