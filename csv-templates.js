// CSV Template Download and Validation Functions
document.addEventListener('DOMContentLoaded', function () {
  let currentMode = 'INSERT'; // 預設模式

  // 模式選擇處理
  const modeRadios = document.querySelectorAll(
    'input[name="csv-operation-mode"]'
  );
  modeRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      currentMode = this.value;
      updateTemplateDescription();
      clearValidationMessage();
    });
  });

  // INSERT 範本下載
  const insertTemplateBtn = document.getElementById('download-insert-template');
  if (insertTemplateBtn) {
    insertTemplateBtn.addEventListener('click', function () {
      downloadTemplate('INSERT');
    });
  }

  // UPDATE 範本下載
  const updateTemplateBtn = document.getElementById('download-update-template');
  if (updateTemplateBtn) {
    updateTemplateBtn.addEventListener('click', function () {
      downloadTemplate('UPDATE');
    });
  }

  // CSV 檔案上傳處理
  const csvFileInput = document.getElementById('csv-file');
  const csvUploadZone = document.getElementById('csv-upload-zone');

  if (csvUploadZone && csvFileInput) {
    csvUploadZone.addEventListener('click', function () {
      csvFileInput.click();
    });

    csvFileInput.addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
        validateAndHandleCSVFile(file);
      } else {
        showValidationMessage('請選擇有效的 CSV 檔案', 'error');
      }
    });

    // 拖放功能
    csvUploadZone.addEventListener('dragover', function (event) {
      event.preventDefault();
      csvUploadZone.style.backgroundColor = '#e3f2fd';
      csvUploadZone.style.border = '2px dashed #2196f3';
    });

    csvUploadZone.addEventListener('dragleave', function (event) {
      event.preventDefault();
      csvUploadZone.style.backgroundColor = '';
      csvUploadZone.style.border = '';
    });

    csvUploadZone.addEventListener('drop', function (event) {
      event.preventDefault();
      csvUploadZone.style.backgroundColor = '';
      csvUploadZone.style.border = '';

      const file = event.dataTransfer.files[0];
      if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
        validateAndHandleCSVFile(file);
      } else {
        showValidationMessage('請選擇有效的 CSV 檔案', 'error');
      }
    });
  }

  // 更新範本描述文字
  function updateTemplateDescription() {
    const description = document.getElementById('template-description');
    if (description) {
      if (currentMode === 'INSERT') {
        description.textContent = '下載 INSERT 範本 - 用於新增資料到資料庫';
      } else {
        description.textContent =
          '下載 UPDATE 範本 - 用於更新現有資料，包含 WHERE 條件和 SET 值';
      }
    }
  }

  // 初始化描述
  updateTemplateDescription();
});

// 下載範本函數
function downloadTemplate(type) {
  let csvContent = '';
  let filename = '';

  if (type === 'INSERT') {
    csvContent =
      '# INSERT_TEMPLATE\n' +
      'id,name,email,age,status\n' +
      '1,張小明,ming@example.com,25,active\n' +
      '2,李小華,hua@example.com,30,inactive\n' +
      '3,王小美,mei@example.com,28,active';
    filename = 'insert_template.csv';
  } else if (type === 'UPDATE') {
    csvContent =
      '# UPDATE_TEMPLATE\n' +
      'WHERE_condition,SET_values\n' +
      '"id = 1","name = \'張小明更新\', email = \'ming.new@example.com\'"\n' +
      '"email = \'hua@example.com\'","status = \'active\', age = 31"\n' +
      '"status = \'inactive\'","name = \'批量更新名稱\'"';
    filename = 'update_template.csv';
  }

  // 建立並下載檔案
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 清理 URL 物件
  URL.revokeObjectURL(url);

  // 顯示成功訊息
  showValidationMessage(`✅ ${type} 範本已成功下載！`, 'success');
  console.log(`已下載 ${filename} 範本`);
}

// 驗證並處理 CSV 檔案
function validateAndHandleCSVFile(file) {
  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const csvData = event.target.result;
      const lines = csvData.split('\n').filter((line) => line.trim());

      if (lines.length === 0) {
        showValidationMessage('❌ CSV 檔案為空或格式不正確', 'error');
        return;
      }

      // 取得當前選擇的模式
      const currentMode = getCurrentMode();

      // 驗證檔案格式
      const validationResult = validateCSVFormat(lines, currentMode);

      if (validationResult.valid) {
        showValidationMessage(validationResult.message, 'success');
        displayCSVPreview(lines, validationResult.headers);
      } else {
        showValidationMessage(validationResult.message, 'error');
        hideCSVPreview();
      }
    } catch (error) {
      console.error('CSV 解析錯誤:', error);
      showValidationMessage('❌ CSV 檔案解析失敗，請確認檔案格式正確', 'error');
    }
  };

  reader.onerror = function () {
    showValidationMessage('❌ 讀取檔案失敗', 'error');
  };

  reader.readAsText(file, 'UTF-8');
}

// 取得當前模式
function getCurrentMode() {
  const checkedRadio = document.querySelector(
    'input[name="csv-operation-mode"]:checked'
  );
  return checkedRadio ? checkedRadio.value : 'INSERT';
}

// 驗證 CSV 格式
function validateCSVFormat(lines, expectedMode) {
  // 檢查第一行是否有範本標識
  const firstLine = lines[0].trim();

  if (!firstLine.startsWith('#')) {
    return {
      valid: false,
      message: '❌ 檔案格式錯誤：請使用官方範本，範本檔案應以 # 開頭',
    };
  }

  if (firstLine.includes('INSERT_TEMPLATE') && expectedMode === 'UPDATE') {
    return {
      valid: false,
      message:
        '❌ 模式不匹配：您選擇了 UPDATE 模式，但上傳的是 INSERT 範本。請下載 UPDATE 範本或切換到 INSERT 模式。',
    };
  }

  if (firstLine.includes('UPDATE_TEMPLATE') && expectedMode === 'INSERT') {
    return {
      valid: false,
      message:
        '❌ 模式不匹配：您選擇了 INSERT 模式，但上傳的是 UPDATE 範本。請下載 INSERT 範本或切換到 UPDATE 模式。',
    };
  }

  if (!firstLine.includes(expectedMode + '_TEMPLATE')) {
    return {
      valid: false,
      message: `❌ 範本類型錯誤：請使用正確的 ${expectedMode} 範本`,
    };
  }

  // 檢查是否有標題行
  if (lines.length < 2) {
    return {
      valid: false,
      message: '❌ 檔案格式錯誤：缺少標題行，請使用官方範本格式',
    };
  }

  const headers = lines[1].split(',').map((header) => header.trim());

  // 驗證 INSERT 格式
  if (expectedMode === 'INSERT') {
    const expectedHeaders = ['id', 'name', 'email', 'age', 'status'];
    if (
      headers.length !== expectedHeaders.length ||
      !headers.every(
        (header, index) =>
          header.toLowerCase() === expectedHeaders[index].toLowerCase()
      )
    ) {
      return {
        valid: false,
        message: `❌ INSERT 範本格式錯誤：期望的標題為 ${expectedHeaders.join(', ')}，實際為 ${headers.join(', ')}`,
      };
    }
  }

  // 驗證 UPDATE 格式
  if (expectedMode === 'UPDATE') {
    const expectedHeaders = ['WHERE_condition', 'SET_values'];
    if (
      headers.length !== expectedHeaders.length ||
      !headers.every(
        (header, index) =>
          header.toLowerCase() === expectedHeaders[index].toLowerCase()
      )
    ) {
      return {
        valid: false,
        message: `❌ UPDATE 範本格式錯誤：期望的標題為 ${expectedHeaders.join(', ')}，實際為 ${headers.join(', ')}`,
      };
    }
  }

  // 檢查是否有資料行
  if (lines.length < 3) {
    return {
      valid: false,
      message: '⚠️ 檔案中沒有資料行，請添加至少一行資料',
    };
  }

  // 驗證通過
  return {
    valid: true,
    message: `✅ ${expectedMode} 檔案格式正確！找到 ${lines.length - 2} 行資料`,
    headers: headers,
  };
}

// 顯示驗證訊息
function showValidationMessage(message, type) {
  const messageDiv = document.getElementById('csv-validation-message');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';

    // 設定樣式
    if (type === 'success') {
      messageDiv.style.backgroundColor = '#d4edda';
      messageDiv.style.color = '#155724';
      messageDiv.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
      messageDiv.style.backgroundColor = '#f8d7da';
      messageDiv.style.color = '#721c24';
      messageDiv.style.border = '1px solid #f5c6cb';
    }

    // 5 秒後自動隱藏成功訊息
    if (type === 'success') {
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 5000);
    }
  }
}

// 清除驗證訊息
function clearValidationMessage() {
  const messageDiv = document.getElementById('csv-validation-message');
  if (messageDiv) {
    messageDiv.style.display = 'none';
  }
}

// 顯示 CSV 預覽
function displayCSVPreview(lines, headers) {
  const previewSection = document.getElementById('csv-preview');
  const previewTable = document.getElementById('csv-preview-table');

  if (previewSection && previewTable) {
    let tableHTML =
      '<table border="1" style="border-collapse: collapse; width: 100%; font-size: 12px;">';

    // 添加標題行
    tableHTML += '<tr style="background-color: #f5f5f5; font-weight: bold;">';
    headers.forEach((header) => {
      tableHTML += `<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">${header}</th>`;
    });
    tableHTML += '</tr>';

    // 添加資料行 (最多顯示前 5 行)
    for (let i = 2; i < Math.min(lines.length, 7); i++) {
      const cells = lines[i].split(',').map((cell) => cell.trim());
      tableHTML += '<tr>';

      for (let j = 0; j < headers.length; j++) {
        const cellValue = j < cells.length ? cells[j] : '';
        tableHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${cellValue}</td>`;
      }
      tableHTML += '</tr>';
    }

    if (lines.length > 7) {
      tableHTML += `<tr><td colspan="${headers.length}" style="padding: 8px; text-align: center; color: #666; font-style: italic;">... 還有 ${lines.length - 7} 行資料</td></tr>`;
    }

    tableHTML += '</table>';
    previewTable.innerHTML = tableHTML;
    previewSection.style.display = 'block';
  }
}

// 隱藏 CSV 預覽
function hideCSVPreview() {
  const previewSection = document.getElementById('csv-preview');
  if (previewSection) {
    previewSection.style.display = 'none';
  }
}
