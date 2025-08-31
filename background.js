// SQL Generator Chrome Extension - Background Service Worker

class BackgroundService {
  constructor() {
    this.initializeEventListeners();
    this.initializeContextMenus();
  }

  initializeEventListeners() {
    // 擴充功能安裝時
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('SQL Generator installed:', details);
      this.handleInstallation(details);
    });

    // 來自popup或content script的訊息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 表示會使用非同步回應
    });

    // 擴充功能啟動時
    chrome.runtime.onStartup.addListener(() => {
      console.log('SQL Generator started');
    });

    // 右鍵選單點擊
    if (chrome.contextMenus && chrome.contextMenus.onClicked) {
      chrome.contextMenus.onClicked.addListener((info, tab) => {
        this.handleContextMenuClick(info, tab);
      });
    }

    // 儲存變更監聽
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });
  }

  async handleInstallation(_details) {
    try {
      // 初始化預設設定
      const defaultSettings = {
        defaultDatabase: 'mysql',
        defaultOperation: 'insert',
        autoSave: true,
        maxHistoryItems: 50,
        theme: 'light',
      };

      await chrome.storage.local.set({
        settings: defaultSettings,
        sqlHistory: [],
        savedTemplates: [],
      });

      // 建立右鍵選單
      this.createContextMenus();

      console.log('SQL Generator initialized with default settings');
    } catch (error) {
      console.error('Installation error:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GENERATE_SQL': {
          const result = await this.generateSQL(message.payload);
          sendResponse({ success: true, data: result });
          break;
        }

        case 'SAVE_TO_HISTORY': {
          await this.saveToHistory(message.payload);
          sendResponse({ success: true });
          break;
        }

        case 'GET_HISTORY': {
          const history = await this.getHistory();
          sendResponse({ success: true, data: history });
          break;
        }

        case 'CLEAR_HISTORY': {
          await this.clearHistory();
          sendResponse({ success: true });
          break;
        }

        case 'SAVE_TEMPLATE': {
          await this.saveTemplate(message.payload);
          sendResponse({ success: true });
          break;
        }

        case 'GET_TEMPLATES': {
          const templates = await this.getTemplates();
          sendResponse({ success: true, data: templates });
          break;
        }

        case 'UPDATE_SETTINGS': {
          await this.updateSettings(message.payload);
          sendResponse({ success: true });
          break;
        }

        case 'GET_SETTINGS': {
          const settings = await this.getSettings();
          sendResponse({ success: true, data: settings });
          break;
        }

        case 'EXPORT_DATA': {
          const exportData = await this.exportData();
          sendResponse({ success: true, data: exportData });
          break;
        }

        case 'IMPORT_DATA': {
          await this.importData(message.payload);
          sendResponse({ success: true });
          break;
        }

        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  createContextMenus() {
    // 檢查 contextMenus API 是否可用
    if (!chrome.contextMenus) {
      console.warn('contextMenus API not available');
      return;
    }

    try {
      // 移除現有選單
      chrome.contextMenus.removeAll(() => {
        // 主選單
        chrome.contextMenus.create({
          id: 'sql-generator-main',
          title: 'SQL Generator',
          contexts: ['page', 'selection'],
        });

        // 子選單 - 從選取的文字生成
        chrome.contextMenus.create({
          id: 'generate-from-selection',
          parentId: 'sql-generator-main',
          title: '從選取文字生成SQL',
          contexts: ['selection'],
        });

        // 子選單 - 開啟擴充功能
        chrome.contextMenus.create({
          id: 'open-popup',
          parentId: 'sql-generator-main',
          title: '開啟SQL生成器',
          contexts: ['page'],
        });

        // 子選單 - 檢測表格
        chrome.contextMenus.create({
          id: 'detect-table',
          parentId: 'sql-generator-main',
          title: '檢測頁面表格',
          contexts: ['page'],
        });
      });
    } catch (error) {
      console.error('Failed to create context menus:', error);
    }
  }

  initializeContextMenus() {
    // 在安裝時建立右鍵選單
    this.createContextMenus();
  }

  async handleContextMenuClick(info, tab) {
    try {
      switch (info.menuItemId) {
        case 'generate-from-selection':
          if (info.selectionText) {
            await this.processSelectedText(info.selectionText, tab);
          }
          break;

        case 'open-popup':
          // 開啟popup (這通常由使用者點擊圖示觸發)
          chrome.action.openPopup();
          break;

        case 'detect-table':
          await this.detectPageTables(tab);
          break;
      }
    } catch (error) {
      console.error('Context menu click error:', error);
    }
  }

  async processSelectedText(selectedText, _tab) {
    try {
      // 嘗試解析選取的文字為JSON或CSV
      let parsedData = null;

      // 嘗試JSON解析
      try {
        parsedData = JSON.parse(selectedText);
        if (Array.isArray(parsedData)) {
          // 儲存解析的資料以供popup使用
          await chrome.storage.local.set({
            tempData: {
              type: 'json',
              data: parsedData,
              timestamp: Date.now(),
            },
          });

          // 顯示通知
          this.showNotification('JSON資料已解析', '請開啟SQL生成器檢視結果');
        }
      } catch (e) {
        // 嘗試CSV解析
        const csvData = this.parseCSVText(selectedText);
        if (csvData && csvData.length > 0) {
          await chrome.storage.local.set({
            tempData: {
              type: 'csv',
              data: csvData,
              timestamp: Date.now(),
            },
          });

          this.showNotification('CSV資料已解析', '請開啟SQL生成器檢視結果');
        }
      }
    } catch (error) {
      console.error('Selected text processing error:', error);
      this.showNotification('解析失敗', '無法解析選取的文字');
    }
  }

  parseCSVText(text) {
    try {
      const lines = text.trim().split('\n');
      if (lines.length < 2) return null;

      const headers =
        lines[0].split('\t').length > 1
          ? lines[0].split('\t')
          : lines[0].split(',');
      const rows = lines
        .slice(1)
        .map((line) =>
          headers.length > 1 && line.split('\t').length > 1
            ? line.split('\t')
            : line.split(',')
        );

      return { headers, rows };
    } catch (error) {
      return null;
    }
  }

  async detectPageTables(tab) {
    try {
      // 注入content script來檢測表格
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          const tables = document.querySelectorAll('table');
          const tableData = [];

          tables.forEach((table, index) => {
            const rows = table.querySelectorAll('tr');
            if (rows.length < 2) return; // 至少要有標題和一列資料

            const headerRow = rows[0];
            const headers = Array.from(
              headerRow.querySelectorAll('th, td')
            ).map((cell) => cell.textContent.trim());

            const dataRows = Array.from(rows)
              .slice(1)
              .map((row) =>
                Array.from(row.querySelectorAll('td')).map((cell) =>
                  cell.textContent.trim()
                )
              );

            if (headers.length > 0 && dataRows.length > 0) {
              tableData.push({
                index: index + 1,
                headers,
                rows: dataRows.slice(0, 10), // 最多取10列
              });
            }
          });

          return tableData;
        },
      });

      if (results[0].result && results[0].result.length > 0) {
        // 儲存檢測到的表格資料
        await chrome.storage.local.set({
          detectedTables: results[0].result,
          detectionTimestamp: Date.now(),
        });

        const tableCount = results[0].result.length;
        this.showNotification(
          `檢測到 ${tableCount} 個表格`,
          '請開啟SQL生成器檢視結果'
        );
      } else {
        this.showNotification('未檢測到表格', '頁面上沒有找到可用的表格');
      }
    } catch (error) {
      console.error('Table detection error:', error);
      this.showNotification('檢測失敗', '無法檢測頁面表格');
    }
  }

  async generateSQL(payload) {
    // 這個方法可以在background處理複雜的SQL生成邏輯
    // 目前主要邏輯在popup.js中，這裡可以作為備用或增強功能
    return payload;
  }

  async saveToHistory(historyItem) {
    try {
      const result = await chrome.storage.local.get(['sqlHistory']);
      const history = result.sqlHistory || [];

      // 新增到歷史記錄開頭
      history.unshift(historyItem);

      // 限制歷史記錄數量
      const settings = await this.getSettings();
      const maxItems = settings.maxHistoryItems || 50;
      if (history.length > maxItems) {
        history.splice(maxItems);
      }

      await chrome.storage.local.set({ sqlHistory: history });
    } catch (error) {
      console.error('Save to history error:', error);
      throw error;
    }
  }

  async getHistory() {
    try {
      const result = await chrome.storage.local.get(['sqlHistory']);
      return result.sqlHistory || [];
    } catch (error) {
      console.error('Get history error:', error);
      return [];
    }
  }

  async clearHistory() {
    try {
      await chrome.storage.local.set({ sqlHistory: [] });
    } catch (error) {
      console.error('Clear history error:', error);
      throw error;
    }
  }

  async saveTemplate(template) {
    try {
      const result = await chrome.storage.local.get(['savedTemplates']);
      const templates = result.savedTemplates || [];

      // 檢查是否已存在相同名稱的範本
      const existingIndex = templates.findIndex(
        (t) => t.name === template.name
      );
      if (existingIndex >= 0) {
        templates[existingIndex] = template;
      } else {
        templates.push(template);
      }

      await chrome.storage.local.set({ savedTemplates: templates });
    } catch (error) {
      console.error('Save template error:', error);
      throw error;
    }
  }

  async getTemplates() {
    try {
      const result = await chrome.storage.local.get(['savedTemplates']);
      return result.savedTemplates || [];
    } catch (error) {
      console.error('Get templates error:', error);
      return [];
    }
  }

  async updateSettings(newSettings) {
    try {
      const result = await chrome.storage.local.get(['settings']);
      const currentSettings = result.settings || {};

      const updatedSettings = { ...currentSettings, ...newSettings };
      await chrome.storage.local.set({ settings: updatedSettings });
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      return result.settings || {};
    } catch (error) {
      console.error('Get settings error:', error);
      return {};
    }
  }

  async exportData() {
    try {
      const data = await chrome.storage.local.get(null);
      return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: data,
      };
    } catch (error) {
      console.error('Export data error:', error);
      throw error;
    }
  }

  async importData(importData) {
    try {
      if (!importData.data) {
        throw new Error('Invalid import data format');
      }

      // 備份現有資料
      const currentData = await chrome.storage.local.get(null);
      await chrome.storage.local.set({
        backup: {
          timestamp: new Date().toISOString(),
          data: currentData,
        },
      });

      // 匯入新資料
      await chrome.storage.local.clear();
      await chrome.storage.local.set(importData.data);
    } catch (error) {
      console.error('Import data error:', error);
      throw error;
    }
  }

  handleStorageChange(changes, namespace) {
    // 監聽儲存變更，可用於同步或通知
    console.log('Storage changed:', changes, namespace);

    // 如果設定變更，可能需要更新右鍵選單等
    if (changes.settings) {
      // 處理設定變更
    }
  }

  showNotification(title, message) {
    try {
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: title,
          message: message,
        });
      } else {
        console.log('Notification:', title, message);
      }
    } catch (error) {
      console.error('Notification error:', error);
    }
  }

  // 定期清理過期的臨時資料
  async cleanupTempData() {
    try {
      const result = await chrome.storage.local.get([
        'tempData',
        'detectedTables',
      ]);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      // 清理超過1小時的臨時資料
      if (result.tempData && now - result.tempData.timestamp > oneHour) {
        await chrome.storage.local.remove(['tempData']);
      }

      if (result.detectedTables && now - result.detectionTimestamp > oneHour) {
        await chrome.storage.local.remove([
          'detectedTables',
          'detectionTimestamp',
        ]);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// 初始化背景服務
const backgroundService = new BackgroundService();

// 定期清理臨時資料 (每30分鐘)
setInterval(
  () => {
    backgroundService.cleanupTempData();
  },
  30 * 60 * 1000
);

// 匯出給其他模組使用
self.backgroundService = backgroundService;
