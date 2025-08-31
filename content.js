// SQL Generator Chrome Extension - Content Script

class ContentScriptManager {
  constructor() {
    this.isInitialized = false;
    this.detectTableTimeout = null;
    this.init();
  }

  init() {
    if (this.isInitialized) return;

    // 等待DOM載入完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initialize();
      });
    } else {
      this.initialize();
    }
  }

  initialize() {
    this.isInitialized = true;

    // 監聽來自background script的訊息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // 監聽DOM變化，檢測動態載入的表格
    this.observeDOM();

    // 初始檢測頁面表格
    this.scheduleTableDetection();
  }

  handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'DETECT_TABLES':
          this.detectTables()
            .then((tables) => {
              sendResponse({ success: true, data: tables });
            })
            .catch((error) => {
              sendResponse({ success: false, error: error.message });
            });
          break;

        case 'GET_SELECTED_TEXT': {
          const selectedText = this.getSelectedText();
          sendResponse({ success: true, data: selectedText });
          break;
        }

        case 'PARSE_SELECTION': {
          this.parseSelectedContent()
            .then((data) => {
              sendResponse({ success: true, data: data });
            })
            .catch((error) => {
              sendResponse({ success: false, error: error.message });
            });
          break;
        }

        case 'HIGHLIGHT_TABLE': {
          this.highlightTable(message.payload.index);
          sendResponse({ success: true });
          break;
        }

        case 'EXTRACT_FORM_DATA': {
          const formData = this.extractFormData();
          sendResponse({ success: true, data: formData });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Content script message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async detectTables() {
    try {
      const tables = document.querySelectorAll('table');
      const tableData = [];

      tables.forEach((table, index) => {
        const tableInfo = this.extractTableData(table, index);
        if (tableInfo) {
          tableData.push(tableInfo);
        }
      });

      return tableData;
    } catch (error) {
      console.error('Table detection error:', error);
      throw error;
    }
  }

  extractTableData(table, index) {
    try {
      // 檢查表格是否有足夠的資料
      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) return null;

      // 提取標題
      const headerRow = rows[0];
      const headerCells = headerRow.querySelectorAll('th, td');
      const headers = Array.from(headerCells)
        .map((cell) => this.cleanText(cell.textContent))
        .filter((header) => header.length > 0);

      if (headers.length === 0) return null;

      // 提取資料列
      const dataRows = [];
      for (let i = 1; i < Math.min(rows.length, 21); i++) {
        // 最多20列資料
        const row = rows[i];
        const cells = row.querySelectorAll('td, th');

        if (cells.length >= headers.length) {
          const rowData = Array.from(cells)
            .slice(0, headers.length)
            .map((cell) => this.cleanText(cell.textContent));
          dataRows.push(rowData);
        }
      }

      if (dataRows.length === 0) return null;

      // 分析資料類型
      const columnTypes = this.analyzeColumnTypes(headers, dataRows);

      return {
        index,
        id: `table-${index}`,
        headers,
        rows: dataRows,
        columnTypes,
        totalRows: rows.length - 1,
        tableElement: table,
        position: this.getElementPosition(table),
        isVisible: this.isElementVisible(table),
      };
    } catch (error) {
      console.error('Table extraction error:', error);
      return null;
    }
  }

  cleanText(text) {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\t/g, ' ')
      .substring(0, 100); // 限制長度
  }

  analyzeColumnTypes(headers, rows) {
    const types = headers.map((header, colIndex) => {
      const columnValues = rows
        .map((row) => row[colIndex])
        .filter((val) => val);
      return this.inferColumnType(header, columnValues);
    });
    return types;
  }

  inferColumnType(header, values) {
    const headerLower = header.toLowerCase();

    // 基於標題的推斷
    if (headerLower.includes('id') || headerLower.includes('序號')) {
      return 'INT';
    }
    if (
      headerLower.includes('date') ||
      headerLower.includes('時間') ||
      headerLower.includes('日期')
    ) {
      return 'DATETIME';
    }
    if (headerLower.includes('email') || headerLower.includes('mail')) {
      return 'VARCHAR';
    }
    if (
      headerLower.includes('price') ||
      headerLower.includes('金額') ||
      headerLower.includes('價格')
    ) {
      return 'DECIMAL';
    }

    // 基於值的推斷
    if (values.length === 0) return 'VARCHAR';

    const sampleValues = values.slice(0, 5); // 取前5個值作為樣本

    // 檢查是否為數字
    const isAllNumbers = sampleValues.every(
      (val) => !isNaN(val) && !isNaN(parseFloat(val))
    );

    if (isAllNumbers) {
      // 檢查是否有小數點
      const hasDecimal = sampleValues.some((val) => val.includes('.'));
      return hasDecimal ? 'DECIMAL' : 'INT';
    }

    // 檢查是否為日期格式
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{4}\/\d{2}\/\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/,
    ];

    const isDate = sampleValues.some((val) =>
      datePatterns.some((pattern) => pattern.test(val))
    );

    if (isDate) return 'DATETIME';

    // 檢查平均長度決定VARCHAR還是TEXT
    const avgLength =
      sampleValues.reduce((sum, val) => sum + val.length, 0) /
      sampleValues.length;

    return avgLength > 100 ? 'TEXT' : 'VARCHAR';
  }

  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  }

  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  getSelectedText() {
    const selection = window.getSelection();
    return selection.toString().trim();
  }

  async parseSelectedContent() {
    const selectedText = this.getSelectedText();
    if (!selectedText) {
      throw new Error('No text selected');
    }

    // 嘗試解析為不同格式
    let parsedData = null;
    let dataType = null;

    // JSON格式
    try {
      const jsonData = JSON.parse(selectedText);
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        parsedData = {
          headers: Object.keys(jsonData[0]),
          rows: jsonData.map((item) => Object.values(item)),
        };
        dataType = 'json';
      }
    } catch (e) {
      // 繼續嘗試其他格式
    }

    // CSV/TSV格式
    if (!parsedData) {
      const csvData = this.parseCSVText(selectedText);
      if (csvData) {
        parsedData = csvData;
        dataType = 'csv';
      }
    }

    // 表格格式 (從HTML複製的表格資料)
    if (!parsedData) {
      const tableData = this.parseTableText(selectedText);
      if (tableData) {
        parsedData = tableData;
        dataType = 'table';
      }
    }

    if (!parsedData) {
      throw new Error('Unable to parse selected content');
    }

    return {
      type: dataType,
      ...parsedData,
    };
  }

  parseCSVText(text) {
    try {
      const lines = text.trim().split('\n');
      if (lines.length < 2) return null;

      // 檢測分隔符 (逗號或Tab)
      const delimiter = lines[0].includes('\t') ? '\t' : ',';

      const headers = lines[0].split(delimiter).map((h) => this.cleanText(h));
      const rows = lines
        .slice(1)
        .map((line) =>
          line.split(delimiter).map((cell) => this.cleanText(cell))
        );

      // 過濾掉空行
      const validRows = rows.filter((row) =>
        row.some((cell) => cell.length > 0)
      );

      if (validRows.length === 0) return null;

      return { headers, rows: validRows };
    } catch (error) {
      return null;
    }
  }

  parseTableText(text) {
    try {
      // 處理從瀏覽器表格複製的文字 (通常以Tab分隔)
      const lines = text.trim().split('\n');
      if (lines.length < 2) return null;

      const rows = lines.map((line) =>
        line.split('\t').map((cell) => this.cleanText(cell))
      );

      // 假設第一行是標題
      const headers = rows[0];
      const dataRows = rows
        .slice(1)
        .filter((row) => row.some((cell) => cell.length > 0));

      if (dataRows.length === 0) return null;

      return { headers, rows: dataRows };
    } catch (error) {
      return null;
    }
  }

  highlightTable(tableIndex) {
    // 移除之前的高亮
    document.querySelectorAll('.sql-generator-highlight').forEach((el) => {
      el.classList.remove('sql-generator-highlight');
    });

    // 高亮指定的表格
    const tables = document.querySelectorAll('table');
    if (tableIndex >= 0 && tableIndex < tables.length) {
      const table = tables[tableIndex];
      table.classList.add('sql-generator-highlight');

      // 滾動到表格位置
      table.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      // 3秒後移除高亮
      setTimeout(() => {
        table.classList.remove('sql-generator-highlight');
      }, 3000);
    }
  }

  extractFormData() {
    const forms = document.querySelectorAll('form');
    const formData = [];

    forms.forEach((form, index) => {
      const inputs = form.querySelectorAll('input, select, textarea');
      const fields = [];

      inputs.forEach((input) => {
        if (input.name || input.id) {
          const fieldName = input.name || input.id;
          const fieldType = this.mapInputTypeToSQL(
            input.type,
            input.tagName.toLowerCase()
          );

          fields.push({
            name: fieldName,
            type: fieldType,
            value: input.value || '',
            label: this.getFieldLabel(input),
          });
        }
      });

      if (fields.length > 0) {
        formData.push({
          index,
          fields,
          action: form.action || '',
          method: form.method || 'POST',
        });
      }
    });

    return formData;
  }

  mapInputTypeToSQL(inputType, tagName) {
    switch (inputType) {
      case 'email':
      case 'url':
      case 'tel':
      case 'text':
        return 'VARCHAR';
      case 'number':
        return 'INT';
      case 'date':
      case 'datetime-local':
        return 'DATETIME';
      case 'checkbox':
        return 'BOOLEAN';
      case 'hidden':
        return 'VARCHAR';
      default:
        if (tagName === 'textarea') {
          return 'TEXT';
        }
        return 'VARCHAR';
    }
  }

  getFieldLabel(input) {
    // 嘗試找到關聯的label
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return this.cleanText(label.textContent);
    }

    // 檢查父元素中的label
    const parent = input.closest('label');
    if (parent) {
      return this.cleanText(parent.textContent.replace(input.value, ''));
    }

    // 檢查前面的文字節點或元素
    let prevSibling = input.previousElementSibling;
    while (prevSibling) {
      if (
        prevSibling.tagName === 'LABEL' ||
        prevSibling.textContent.trim().length > 0
      ) {
        return this.cleanText(prevSibling.textContent);
      }
      prevSibling = prevSibling.previousElementSibling;
    }

    // 使用placeholder或name作為備選
    return input.placeholder || input.name || input.id || 'Unknown';
  }

  observeDOM() {
    const observer = new MutationObserver((mutations) => {
      let hasTableChanges = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const hasNewTables = addedNodes.some(
            (node) =>
              node.nodeType === Node.ELEMENT_NODE &&
              (node.tagName === 'TABLE' || node.querySelector('table'))
          );

          if (hasNewTables) {
            hasTableChanges = true;
          }
        }
      });

      if (hasTableChanges) {
        this.scheduleTableDetection();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  scheduleTableDetection() {
    // 防止頻繁檢測
    if (this.detectTableTimeout) {
      clearTimeout(this.detectTableTimeout);
    }

    this.detectTableTimeout = setTimeout(() => {
      this.sendTableUpdateNotification();
    }, 1000);
  }

  async sendTableUpdateNotification() {
    try {
      const tables = await this.detectTables();
      if (tables.length > 0) {
        // 通知background script有新表格
        chrome.runtime.sendMessage({
          type: 'TABLES_DETECTED',
          payload: { tables, url: window.location.href },
        });
      }
    } catch (error) {
      console.error('Table update notification error:', error);
    }
  }
}

// 注入CSS樣式
const style = document.createElement('style');
style.textContent = `
    .sql-generator-highlight {
        outline: 3px solid #667eea !important;
        outline-offset: 2px !important;
        background-color: rgba(102, 126, 234, 0.1) !important;
        transition: all 0.3s ease !important;
    }
`;
document.head.appendChild(style);

// 初始化content script
new ContentScriptManager();
