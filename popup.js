// Enhanced Import SQL Generator - Main Application Script

class EnhancedSQLGenerator {
  constructor() {
    this.currentStep = 1;
    this.maxStep = 6;

    try {
      // Check if modules are loaded
      if (typeof CSVParser === 'undefined') {
        throw new Error('CSVParser module not loaded');
      }
      if (typeof FieldMapper === 'undefined') {
        throw new Error('FieldMapper module not loaded');
      }
      if (typeof SQLGenerator === 'undefined') {
        throw new Error('SQLGenerator module not loaded');
      }
      if (typeof ExportManager === 'undefined') {
        throw new Error('ExportManager module not loaded');
      }

      // Initialize core modules with error handling
      this.csvParser = new window.CSVParser();
      this.fieldMapper = new window.FieldMapper();
      this.sqlGenerator = new window.SQLGenerator();
      this.exportManager = new window.ExportManager();

      console.log('All modules initialized successfully');
    } catch (error) {
      console.error('Failed to initialize core modules:', error);

      // Show user-friendly error message
      setTimeout(() => {
        const errorMsg =
          '模組載入失敗: ' +
          error.message +
          '. 請重新整理頁面或檢查瀏覽器控制台。';
        if (document.getElementById('error-section')) {
          this.showError(errorMsg);
        } else {
          alert(errorMsg);
        }
      }, 100);
      return;
    }

    this.appState = {
      databaseName: '',
      databaseType: 'mysql', // Default database type
      tableName: '',
      operationMode: '', // 'INSERT' or 'UPDATE'
      templateDownloaded: false,
      uploadedFile: null,
      csvData: null,
      fieldMappings: null,
      validationResults: null,
      processingOptions: {
        batchSize: 500,
        includeTransaction: true,
        includeComments: true,
        includeCreateTable: false,
        insertMode: 'normal', // 'normal', 'ignore', 'update'
      },
      generatedSQL: null,
    };

    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.showStep(1);
    this.loadSavedState();
  }

  setupEventListeners() {
    // Step 1: Database name input
    const databaseInput = document.getElementById('database-name');
    if (databaseInput) {
      databaseInput.addEventListener(
        'input',
        this.handleDatabaseNameInput.bind(this)
      );
      databaseInput.addEventListener(
        'blur',
        this.validateDatabaseName.bind(this)
      );
    }

    const databaseTypeSelect = document.getElementById('database-type');
    if (databaseTypeSelect) {
      databaseTypeSelect.addEventListener(
        'change',
        this.handleDatabaseTypeChange.bind(this)
      );
    }

    const tableNameInput = document.getElementById('table-name');
    if (tableNameInput) {
      tableNameInput.addEventListener(
        'input',
        this.handleTableNameInput.bind(this)
      );
    }

    // Step 2: Operation mode selection
    const modeRadios = document.querySelectorAll(
      'input[name="operation-mode"]'
    );
    modeRadios.forEach((radio) => {
      radio.addEventListener('change', this.handleModeSelection.bind(this));
    });

    // Step 3: Template download
    const downloadTemplateBtn = document.getElementById('download-template');
    if (downloadTemplateBtn) {
      downloadTemplateBtn.addEventListener(
        'click',
        this.downloadTemplate.bind(this)
      );
    }

    // Step 4: File upload functionality
    this.setupFileUploadListeners();

    // Step 5: File preview navigation
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    if (prevPageBtn)
      prevPageBtn.addEventListener('click', this.previousPage.bind(this));
    if (nextPageBtn)
      nextPageBtn.addEventListener('click', this.nextPage.bind(this));

    // Step 6: Processing options
    this.setupProcessingOptionsListeners();

    // Step 7: Results management
    this.setupResultsListeners();

    // Global event listeners
    const restartBtn = document.getElementById('restart-process');
    if (restartBtn) {
      restartBtn.addEventListener('click', this.restartProcess.bind(this));
    }
  }

  // Step 4: File Upload Implementation - Task 2
  setupFileUploadListeners() {
    const fileInput = document.getElementById('file-input');
    const uploadZone = document.getElementById('upload-zone');
    const removeFileBtn = document.getElementById('remove-file');
    const validateFileBtn = document.getElementById('validate-file');

    // File input change event
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileSelect(e.target.files[0]);
        }
      });
    }

    // Upload zone click event
    if (uploadZone) {
      uploadZone.addEventListener('click', () => {
        fileInput?.click();
      });
    }

    // Drag and drop functionality
    this.setupDragAndDrop(uploadZone);

    // File action buttons
    if (removeFileBtn) {
      removeFileBtn.addEventListener('click', this.removeFile.bind(this));
    }

    if (validateFileBtn) {
      validateFileBtn.addEventListener('click', this.validateFile.bind(this));
    }
  }

  setupDragAndDrop(uploadZone) {
    if (!uploadZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      uploadZone.addEventListener(eventName, this.preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      uploadZone.addEventListener(
        eventName,
        () => {
          uploadZone.classList.add('dragover');
        },
        false
      );
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      uploadZone.addEventListener(
        eventName,
        () => {
          uploadZone.classList.remove('dragover');
        },
        false
      );
    });

    uploadZone.addEventListener(
      'drop',
      (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.handleFileSelect(files[0]);
        }
      },
      false
    );
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleFileSelect(file) {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.showError('Invalid file type. Please select a CSV file.');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      this.showError(
        'File size exceeds 10MB limit. Please choose a smaller file.'
      );
      return;
    }

    // Store file and update UI
    this.appState.uploadedFile = file;
    this.updateFileInfo(file);
    this.showFileInfo();
  }

  updateFileInfo(file) {
    const fileNameElement = document.getElementById('file-name');
    const fileSizeElement = document.getElementById('file-size');
    const fileStatusElement = document.getElementById('file-status');

    if (fileNameElement) fileNameElement.textContent = file.name;
    if (fileSizeElement)
      fileSizeElement.textContent = this.formatFileSize(file.size);
    if (fileStatusElement) {
      fileStatusElement.textContent = 'Ready';
      fileStatusElement.className = 'status-ready';
    }
  }

  showFileInfo() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInfo = document.getElementById('file-info');

    if (uploadZone) uploadZone.style.display = 'none';
    if (fileInfo) fileInfo.style.display = 'block';
  }

  removeFile() {
    this.appState.uploadedFile = null;
    this.appState.csvData = null;
    this.appState.validationResults = null;

    const uploadZone = document.getElementById('upload-zone');
    const fileInfo = document.getElementById('file-info');
    const validationMessages = document.getElementById('validation-messages');
    const progressBar = document.getElementById('upload-progress');

    if (uploadZone) uploadZone.style.display = 'block';
    if (fileInfo) fileInfo.style.display = 'none';
    if (validationMessages) validationMessages.style.display = 'none';
    if (progressBar) progressBar.style.display = 'none';

    // Clear file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';

    // Hide preview and subsequent steps
    this.hideStepsAfter(4);
  }

  async validateFile() {
    if (!this.appState.uploadedFile) {
      this.showError('No file selected for validation');
      return;
    }

    const fileStatusElement = document.getElementById('file-status');
    const progressBar = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    try {
      // Validate file size again
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (this.appState.uploadedFile.size > maxSize) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Update status and show progress
      if (fileStatusElement) {
        fileStatusElement.textContent = 'Processing';
        fileStatusElement.className = 'status-processing';
      }

      if (progressBar) progressBar.style.display = 'block';

      // Simulate progress for user feedback
      this.updateProgress(0, 'Reading file...');

      // Read file content with timeout
      const csvContent = await Promise.race([
        this.readFileAsText(this.appState.uploadedFile),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('File reading timeout')), 30000)
        ),
      ]);

      this.updateProgress(30, 'Parsing CSV data...');

      // Parse CSV content
      const csvData = this.parseCSVContent(csvContent);

      if (!csvData || !csvData.headers || csvData.headers.length === 0) {
        throw new Error('Invalid CSV structure: No headers found');
      }

      this.updateProgress(60, 'Validating data structure...');

      // Validate CSV structure based on operation mode
      const validationResults = this.validateCSVStructure(csvData);
      this.updateProgress(90, 'Finalizing validation...');

      // Store results
      this.appState.csvData = csvData;
      this.appState.validationResults = validationResults;

      this.updateProgress(100, 'Validation complete!');

      setTimeout(() => {
        if (progressBar) progressBar.style.display = 'none';

        if (validationResults.isValid) {
          if (fileStatusElement) {
            fileStatusElement.textContent = 'Valid';
            fileStatusElement.className = 'status-ready';
          }
          this.showValidationResults(validationResults);
          this.showStep(5); // Show preview
          this.populatePreview(csvData);
        } else {
          if (fileStatusElement) {
            fileStatusElement.textContent = 'Invalid';
            fileStatusElement.className = 'status-error';
          }
          this.showValidationErrors(validationResults.errors);
        }
      }, 500);
    } catch (error) {
      console.error('File validation error:', error);

      if (fileStatusElement) {
        fileStatusElement.textContent = 'Error';
        fileStatusElement.className = 'status-error';
      }
      if (progressBar) progressBar.style.display = 'none';

      let errorMessage = 'File validation failed';
      if (error.message.includes('timeout')) {
        errorMessage += ': File processing timed out. Try a smaller file.';
      } else if (error.message.includes('Invalid CSV structure')) {
        errorMessage += ': ' + error.message;
      } else if (error.message.includes('exceeds')) {
        errorMessage += ': ' + error.message;
      } else {
        errorMessage += ': ' + error.message;
      }

      this.showError(errorMessage);
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  parseCSVContent(csvContent) {
    try {
      // Use the CSVParser module for proper parsing
      const csvData = this.csvParser.parseCSVText(csvContent);

      // Convert to the expected format for compatibility
      const rowObjects = csvData.rows.map((row) => {
        const obj = {};
        csvData.headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      // Generate field mappings using FieldMapper
      const fieldMappings = this.fieldMapper.generateMapping({
        headers: csvData.headers,
        rows: rowObjects,
      });

      // Store field mappings in app state
      this.appState.fieldMappings = fieldMappings;

      return {
        headers: csvData.headers,
        rows: csvData.rows,
        totalRows: csvData.totalRows,
        totalColumns: csvData.columns,
        fieldMappings: fieldMappings,
      };
    } catch (error) {
      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }

  parseCSVLine(line) {
    // Use the CSVParser module's line parsing
    return this.csvParser.parseCSVLine(line);
  }

  validateCSVStructure(csvData) {
    const errors = [];
    const warnings = [];

    // Basic structure validation
    if (csvData.totalRows === 0) {
      errors.push('CSV file contains no data rows');
    }

    if (csvData.totalColumns === 0) {
      errors.push('CSV file contains no columns');
    }

    // Check for empty headers
    csvData.headers.forEach((header, index) => {
      if (!header || header.trim() === '') {
        errors.push(`Column ${index + 1} has an empty header`);
      }
    });

    // Mode-specific validation
    if (this.appState.operationMode === 'UPDATE') {
      this.validateUpdateModeCSV(csvData, errors, warnings);
    } else if (this.appState.operationMode === 'INSERT') {
      this.validateInsertModeCSV(csvData, errors, warnings);
    }

    // Check row consistency
    csvData.rows.forEach((row, index) => {
      if (row.length !== csvData.totalColumns) {
        warnings.push(
          `Row ${index + 2} has ${row.length} columns, expected ${csvData.totalColumns}`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRows: csvData.totalRows,
        totalColumns: csvData.totalColumns,
        validRows: csvData.rows.filter(
          (row) => row.length === csvData.totalColumns
        ).length,
      },
    };
  }

  validateUpdateModeCSV(csvData, errors, warnings) {
    // Check for SET column indicators (columns ending with '_SET')
    const setColumns = csvData.headers.filter(
      (header) =>
        header.toLowerCase().includes('_set') ||
        header.toLowerCase().includes('[set]')
    );

    // Check for WHERE column indicators
    const whereColumns = csvData.headers.filter(
      (header) =>
        header.toLowerCase().includes('_where') ||
        header.toLowerCase().includes('[where]')
    );

    if (setColumns.length === 0) {
      warnings.push(
        'No SET columns detected. Consider using column names ending with "_SET" or "[SET]"'
      );
    }

    if (whereColumns.length === 0) {
      warnings.push(
        'No WHERE columns detected. Consider using column names ending with "_WHERE" or "[WHERE]"'
      );
    }
  }

  validateInsertModeCSV(csvData, errors, warnings) {
    // Check for reasonable number of columns
    if (csvData.totalColumns > 50) {
      warnings.push(
        `Large number of columns (${csvData.totalColumns}). Consider splitting into multiple operations.`
      );
    }

    // Check for potential ID conflicts
    const idColumns = csvData.headers.filter((header) =>
      header.toLowerCase().includes('id')
    );

    if (idColumns.length > 0) {
      warnings.push(
        'ID columns detected. Ensure no primary key conflicts will occur.'
      );
    }
  }

  showValidationResults(results) {
    const validationMessages = document.getElementById('validation-messages');
    const validationContent = document.getElementById('validation-content');

    if (!validationMessages || !validationContent) return;

    let content = '<div class="validation-summary">';
    content += `<p><strong>Validation Summary:</strong></p>`;
    content += `<p>✅ File is valid for ${this.appState.operationMode} operation</p>`;
    content += `<p>📊 ${results.summary.totalRows} data rows, ${results.summary.totalColumns} columns</p>`;

    if (results.warnings.length > 0) {
      content += '<p><strong>Warnings:</strong></p>';
      results.warnings.forEach((warning) => {
        content += `<p style="color: #FF9800;">⚠️ ${warning}</p>`;
      });
    }

    content += '</div>';

    validationContent.innerHTML = content;
    validationMessages.style.display = 'block';
  }

  showValidationErrors(errors) {
    const validationMessages = document.getElementById('validation-messages');
    const validationContent = document.getElementById('validation-content');

    if (!validationMessages || !validationContent) return;

    let content = '<div class="validation-errors">';
    content += '<p><strong>Validation Errors:</strong></p>';
    errors.forEach((error) => {
      content += `<p style="color: #f44336;">❌ ${error}</p>`;
    });
    content += '<p>Please fix these issues and try again.</p>';
    content += '</div>';

    validationContent.innerHTML = content;
    validationMessages.style.display = 'block';
  }

  updateProgress(percentage, text) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = text;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Additional helper methods for other steps
  handleDatabaseNameInput(e) {
    const value = e.target.value.trim();
    this.appState.databaseName = value;

    // Extract potential table name from database name
    if (value && !this.appState.tableName) {
      this.appState.tableName = value;
    }

    if (value) {
      this.showStep(2);
    } else {
      this.hideStepsAfter(1);
    }

    this.saveState();
  }

  validateDatabaseName(e) {
    const value = e.target.value.trim();
    const validationElement = document.getElementById('database-validation');
    const dbNamePattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

    if (!value) {
      this.showValidationMessage(
        validationElement,
        'Database name is required',
        'error'
      );
      return false;
    }

    if (!dbNamePattern.test(value)) {
      this.showValidationMessage(
        validationElement,
        'Invalid database name. Use letters, numbers, underscores, and hyphens only.',
        'error'
      );
      return false;
    }

    this.showValidationMessage(
      validationElement,
      'Valid database name',
      'success'
    );
    return true;
  }

  handleDatabaseTypeChange(e) {
    this.appState.databaseType = e.target.value;
    this.saveState();
  }

  handleTableNameInput(e) {
    this.appState.tableName =
      e.target.value.trim() || this.appState.databaseName;
    this.saveState();
  }

  handleModeSelection(e) {
    this.appState.operationMode = e.target.value;
    this.updateTemplateDescription();
    this.updateProcessingSummary(); // Update processing options visibility
    this.showStep(3);
    this.hideStepsAfter(3);
    this.saveState();
  }

  updateTemplateDescription() {
    const descriptionElement = document.getElementById('template-description');
    const downloadBtn = document.getElementById('download-template');

    if (!descriptionElement) return;

    if (this.appState.operationMode === 'INSERT') {
      descriptionElement.textContent =
        'Download the INSERT template to structure your data for batch insertion. The template includes all necessary columns for inserting new records.';
    } else if (this.appState.operationMode === 'UPDATE') {
      descriptionElement.textContent =
        'Download the UPDATE template with SET and WHERE column indicators. Use [SET] suffix for columns to update and [WHERE] suffix for condition columns.';
    }

    if (downloadBtn) downloadBtn.disabled = false;
  }

  downloadTemplate() {
    // This would integrate with the existing csv-templates.js
    // For now, create a basic template
    let csvContent = '';

    if (this.appState.operationMode === 'INSERT') {
      csvContent =
        'id,name,email,phone,created_date\n1,John Doe,john@example.com,123-456-7890,2024-01-01\n2,Jane Smith,jane@example.com,987-654-3210,2024-01-02';
    } else {
      csvContent =
        'id[WHERE],name[SET]\n' + '1,John Updated\n' + '2,Jane Updated';
    }

    this.downloadCSVFile(
      csvContent,
      `${this.appState.operationMode.toLowerCase()}_template.csv`
    );

    this.appState.templateDownloaded = true;
    this.showStep(4);

    const statusElement = document.getElementById('template-status');
    if (statusElement) {
      statusElement.textContent = 'Template downloaded successfully!';
      statusElement.style.color = '#4CAF50';
    }

    this.saveState();
  }

  downloadCSVFile(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Preview functionality (Step 5)
  populatePreview(csvData) {
    const previewStats = document.getElementById('preview-stats');
    const previewThead = document.getElementById('preview-thead');
    const previewTbody = document.getElementById('preview-tbody');

    if (previewStats) {
      previewStats.innerHTML = `
                <strong>File Statistics:</strong><br>
                📁 File: ${this.appState.uploadedFile.name}<br>
                📊 Rows: ${csvData.totalRows} | Columns: ${csvData.totalColumns}<br>
                🎯 Mode: ${this.appState.operationMode}
            `;
    }

    // Populate table headers
    if (previewThead) {
      const headerRow = csvData.headers
        .map((header) => `<th>${header}</th>`)
        .join('');
      previewThead.innerHTML = `<tr>${headerRow}</tr>`;
    }

    // Populate table body (first 10 rows)
    if (previewTbody) {
      const rows = csvData.rows
        .slice(0, 10)
        .map((row) => {
          const cells = row.map((cell) => `<td>${cell}</td>`).join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      previewTbody.innerHTML = rows;
    }

    this.showStep(6);
  }

  // Processing options setup
  setupProcessingOptionsListeners() {
    const batchSizeSelect = document.getElementById('batch-size');
    const transactionCheckbox = document.getElementById('include-transaction');
    const commentsCheckbox = document.getElementById('include-comments');
    const createTableCheckbox = document.getElementById('include-create-table');
    const insertModeSelect = document.getElementById('insert-mode');
    const generateBtn = document.getElementById('generate-sql');

    [
      batchSizeSelect,
      transactionCheckbox,
      commentsCheckbox,
      createTableCheckbox,
      insertModeSelect,
    ].forEach((element) => {
      if (element) {
        element.addEventListener(
          'change',
          this.updateProcessingSummary.bind(this)
        );
      }
    });

    if (generateBtn) {
      generateBtn.addEventListener('click', this.generateSQL.bind(this));
    }
  }

  updateProcessingSummary() {
    const batchSize = document.getElementById('batch-size')?.value || '500';
    const includeTransaction =
      document.getElementById('include-transaction')?.checked || false;
    const includeComments =
      document.getElementById('include-comments')?.checked || false;
    const includeCreateTable =
      document.getElementById('include-create-table')?.checked || false;
    const insertMode =
      document.getElementById('insert-mode')?.value || 'normal';
    const summaryElement = document.getElementById('process-summary');
    const generateBtn = document.getElementById('generate-sql');
    const insertModeGroup = document.getElementById('insert-mode-group');

    this.appState.processingOptions = {
      batchSize: batchSize === 'all' ? 'all' : parseInt(batchSize),
      includeTransaction,
      includeComments,
      includeCreateTable,
      insertMode,
    };

    // Show/hide INSERT mode options based on operation mode
    if (insertModeGroup) {
      insertModeGroup.style.display =
        this.appState.operationMode === 'INSERT' ? 'block' : 'none';
    }

    if (summaryElement && this.appState.csvData) {
      const totalRows = this.appState.csvData.totalRows;
      const batches =
        batchSize === 'all' ? 1 : Math.ceil(totalRows / parseInt(batchSize));

      // Estimate SQL size
      let sizeEstimate;
      try {
        sizeEstimate = this.sqlGenerator.estimateSize({
          csvData: {
            rows: Array(totalRows).fill({}),
          },
          fieldMappings: this.appState.fieldMappings || {},
          options: this.appState.processingOptions,
        });
      } catch (error) {
        sizeEstimate = { estimatedSizeKB: 0 };
      }

      let summaryHTML = `
                <strong>Processing Summary:</strong><br>
                📊 ${totalRows} rows will be processed in ${batches} batch${batches > 1 ? 'es' : ''}<br>
                💾 Estimated SQL size: ${sizeEstimate.estimatedSizeKB} KB<br>
                ${includeTransaction ? '🔒 Transaction wrapper will be included<br>' : ''}
                ${includeComments ? '💬 Comments will be included<br>' : ''}
                ${includeCreateTable ? '🛠️ CREATE TABLE statement will be included<br>' : ''}`;

      if (this.appState.operationMode === 'INSERT' && insertMode !== 'normal') {
        const modeDescriptions = {
          ignore: 'Duplicate records will be ignored',
          update: 'Duplicate records will be updated',
        };
        summaryHTML += `🔄 ${modeDescriptions[insertMode]}<br>`;
      }

      summaryHTML += `🎯 Target: ${this.appState.databaseName} database (${this.appState.operationMode} mode)`;

      summaryElement.innerHTML = summaryHTML;
    }

    // Enable/disable generate button based on completion status
    if (generateBtn) {
      const canGenerate =
        this.appState.csvData &&
        this.appState.databaseName &&
        this.appState.operationMode &&
        this.appState.validationResults?.isValid;
      generateBtn.disabled = !canGenerate;

      if (!canGenerate) {
        let missingItems = [];
        if (!this.appState.databaseName) missingItems.push('database name');
        if (!this.appState.operationMode) missingItems.push('operation mode');
        if (!this.appState.csvData) missingItems.push('CSV file');
        if (!this.appState.validationResults?.isValid)
          missingItems.push('valid CSV data');

        generateBtn.title = `Missing: ${missingItems.join(', ')}`;
      } else {
        generateBtn.title = 'Generate SQL statements';
      }
    }
  }

  async generateSQL() {
    const generateBtn = document.getElementById('generate-sql');

    try {
      // Disable button during processing
      if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
      }

      // Comprehensive validation
      if (!this.appState.csvData || !this.appState.fieldMappings) {
        throw new Error(
          'No data available for SQL generation. Please upload and validate a CSV file first.'
        );
      }

      if (!this.appState.databaseName.trim()) {
        throw new Error('Database name is required');
      }

      if (!this.appState.operationMode) {
        throw new Error('Operation mode (INSERT/UPDATE) must be selected');
      }

      if (this.appState.csvData.totalRows === 0) {
        throw new Error('No data rows found in CSV file');
      }

      // Determine table name with validation
      if (!this.appState.tableName) {
        console.log('tableNameAAAA:::', this.appState.tableName);
        this.appState.tableName = this.appState.uploadedFile
          ? this.appState.uploadedFile.name
              .replace(/\.csv$/i, '')
              .replace(/[^a-zA-Z0-9_]/g, '_')
          : 'imported_table';
        console.log('tableNameBBBB:::', this.appState.tableName);
      }

      // Validate table name
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(this.appState.tableName)) {
        this.appState.tableName = 'imported_table';
      }

      // Prepare CSV data for SQL generator
      const csvDataForGenerator = {
        headers: this.appState.csvData.headers,
        rows: this.appState.csvData.rows.map((row) => {
          const obj = {};
          this.appState.csvData.headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        }),
      };
      console.log('csvDataForGenerator:::', csvDataForGenerator);

      // Validate field mappings
      const mappingValidation = this.fieldMapper.validateMappings(
        this.appState.fieldMappings
      );
      if (!mappingValidation.isValid) {
        throw new Error(
          `Field mapping validation failed: ${mappingValidation.errors.join(', ')}`
        );
      }
      console.log('mappingValidation:::', mappingValidation);

      // Generate SQL using the SQLGenerator module
      const config = {
        operation: this.appState.operationMode,
        databaseName: this.appState.databaseName,
        tableName: this.appState.tableName,
        databaseType: this.appState.databaseType,
        fieldMappings: this.appState.fieldMappings,
        csvData: csvDataForGenerator,
        options: this.appState.processingOptions,
      };
      console.log('config:::', config);

      const result = this.sqlGenerator.generateSQL(config);
      console.log('result:::', result);

      if (result.success && result.sql) {
        this.appState.generatedSQL = result.sql;
        this.appState.generationMetadata = result.metadata;

        this.populateResults(result.sql, result.metadata);
        this.showStep(7);

        this.showSuccess(
          `SQL generated successfully! ${result.metadata?.recordCount || 0} records processed.`
        );
      } else {
        throw new Error('SQL generation failed: No SQL output generated');
      }
    } catch (error) {
      console.error('SQL generation error:', error);

      let errorMessage = 'SQL generation failed';
      if (error.message.includes('No data available')) {
        errorMessage += '. Please upload and validate a CSV file first.';
      } else if (error.message.includes('Database name')) {
        errorMessage += '. Please enter a valid database name.';
      } else if (error.message.includes('Operation mode')) {
        errorMessage += '. Please select INSERT or UPDATE mode.';
      } else if (error.message.includes('Field mapping')) {
        errorMessage +=
          '. There are issues with field mapping: ' +
          error.message.split(': ')[1];
      } else {
        errorMessage += ': ' + error.message;
      }

      this.showError(errorMessage);
    } finally {
      // Re-enable button
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate SQL';
      }
    }
  }

  // Removed - SQL generation is now handled by the SQLGenerator module

  // Results management
  setupResultsListeners() {
    const copyBtn = document.getElementById('copy-sql');
    const downloadBtn = document.getElementById('download-sql');
    const clearBtn = document.getElementById('clear-output');

    if (copyBtn) copyBtn.addEventListener('click', this.copySQL.bind(this));
    if (downloadBtn)
      downloadBtn.addEventListener('click', this.downloadSQL.bind(this));
    if (clearBtn)
      clearBtn.addEventListener('click', this.clearResults.bind(this));
  }

  populateResults(sql, metadata) {
    const resultsStats = document.getElementById('results-stats');
    const sqlOutput = document.getElementById('sql-output');

    if (resultsStats) {
      const stats = metadata || {};
      resultsStats.innerHTML = `
                <strong>Generation Complete:</strong><br>
                📊 Database: ${this.appState.databaseName} (${this.appState.databaseType})<br>
                📋 Table: ${this.appState.tableName}<br>
                🎯 Mode: ${this.appState.operationMode}<br>
                📄 ${stats.recordCount || 0} rows processed in ${stats.batchCount || 1} batches<br>
                💾 SQL Size: ${this.formatFileSize(sql?.length || 0)}<br>
                ⏰ Generated: ${new Date().toLocaleString()}
            `;
    }

    if (sqlOutput) {
      sqlOutput.textContent = sql;
    }
  }

  async copySQL() {
    if (!this.appState.generatedSQL) {
      this.showError('No SQL available to copy. Please generate SQL first.');
      return;
    }

    const copyBtn = document.getElementById('copy-sql');

    try {
      if (copyBtn) {
        copyBtn.disabled = true;
        copyBtn.textContent = '📋 Copying...';
      }

      const exportConfig = {
        sql: this.appState.generatedSQL,
        metadata: this.appState.generationMetadata || {
          operation: this.appState.operationMode,
          databaseName: this.appState.databaseName,
          tableName: this.appState.tableName,
          databaseType: this.appState.databaseType,
        },
        format: 'sql',
        method: 'clipboard',
      };

      const result = await this.exportManager.exportSQL(exportConfig);

      if (result.success) {
        this.showSuccess(
          `SQL copied to clipboard! (${this.formatFileSize(result.size)})`
        );
      } else {
        throw new Error('Copy failed: Unknown error');
      }
    } catch (error) {
      console.error('Copy error:', error);

      let errorMessage = 'Copy failed';
      if (error.message.includes('too large')) {
        errorMessage += ': Content too large for clipboard (>1MB)';
      } else if (error.message.includes('permission')) {
        errorMessage += ': Clipboard access denied. Check browser permissions.';
      } else if (error.message.includes('not supported')) {
        errorMessage += ': Clipboard not supported in this browser';
      } else {
        errorMessage += ': ' + error.message;
      }

      this.showError(errorMessage);
    } finally {
      if (copyBtn) {
        copyBtn.disabled = false;
        copyBtn.textContent = '📋 Copy';
      }
    }
  }

  async downloadSQL() {
    if (!this.appState.generatedSQL) {
      this.showError(
        'No SQL available to download. Please generate SQL first.'
      );
      return;
    }

    const downloadBtn = document.getElementById('download-sql');

    try {
      if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.textContent = '💾 Downloading...';
      }

      const exportConfig = {
        sql: this.appState.generatedSQL,
        metadata: this.appState.generationMetadata || {
          operation: this.appState.operationMode,
          databaseName: this.appState.databaseName,
          tableName: this.appState.tableName,
          databaseType: this.appState.databaseType,
        },
        format: 'sql',
        method: 'download',
      };

      const result = await this.exportManager.exportSQL(exportConfig);

      if (result.success) {
        this.showSuccess(
          `SQL file downloaded: ${result.filename} (${this.formatFileSize(result.size)})`
        );
      } else {
        throw new Error('Export failed: Unknown error');
      }
    } catch (error) {
      console.error('Download error:', error);

      let errorMessage = 'Download failed';
      if (error.message.includes('Blob')) {
        errorMessage += ': Browser does not support file downloads';
      } else if (error.message.includes('permission')) {
        errorMessage += ': Permission denied. Check browser download settings.';
      } else {
        errorMessage += ': ' + error.message;
      }

      this.showError(errorMessage);
    } finally {
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '💾 Download';
      }
    }
  }

  clearResults() {
    const sqlOutput = document.getElementById('sql-output');
    if (sqlOutput) sqlOutput.textContent = '';
    this.appState.generatedSQL = null;
  }

  restartProcess() {
    this.appState = {
      databaseName: '',
      operationMode: '',
      templateDownloaded: false,
      uploadedFile: null,
      csvData: null,
      validationResults: null,
      processingOptions: {
        batchSize: 500,
        includeTransaction: true,
        includeComments: true,
      },
      generatedSQL: null,
    };

    // Clear all form inputs
    const dbInput = document.getElementById('database-name');
    if (dbInput) dbInput.value = '';

    const dbTypeSelect = document.getElementById('database-type');
    if (dbTypeSelect) dbTypeSelect.value = 'mysql';

    const tableInput = document.getElementById('table-name');
    if (tableInput) tableInput.value = '';

    const modeRadios = document.querySelectorAll(
      'input[name="operation-mode"]'
    );
    modeRadios.forEach((radio) => (radio.checked = false));

    // Reset UI
    this.removeFile();
    this.showStep(1);
    this.clearState();
  }

  // Utility methods
  showStep(step) {
    for (let i = 1; i <= this.maxStep; i++) {
      const stepElement = document.getElementById(this.getStepElementId(i));
      if (stepElement) {
        stepElement.style.display = i <= step ? 'block' : 'none';
      }
    }
    this.currentStep = step;
  }

  hideStepsAfter(step) {
    for (let i = step + 1; i <= this.maxStep; i++) {
      const stepElement = document.getElementById(this.getStepElementId(i));
      if (stepElement) {
        stepElement.style.display = 'none';
      }
    }
  }

  getStepElementId(step) {
    const stepIds = {
      1: 'database-block',
      2: 'mode-block',
      3: 'template-update-block',
      4: 'preview-block',
      5: 'process-block',
      6: 'results-block',
    };
    return stepIds[step];
  }

  showValidationMessage(element, message, type) {
    if (!element) return;

    element.textContent = message;
    element.className = `validation-message ${type}`;
  }

  showError(message) {
    const errorSection = document.getElementById('error-section');
    const errorText = document.getElementById('error-text');

    if (errorText) errorText.textContent = message;
    if (errorSection) {
      errorSection.style.display = 'block';
      setTimeout(() => {
        errorSection.style.display = 'none';
      }, 5000);
    }
  }

  showSuccess(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 13px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  }

  // State management
  saveState() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        enhancedSQLGeneratorState: this.appState,
      });
    } else {
      localStorage.setItem(
        'enhancedSQLGeneratorState',
        JSON.stringify(this.appState)
      );
    }
  }

  loadSavedState() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['enhancedSQLGeneratorState'], (result) => {
        if (result.enhancedSQLGeneratorState) {
          this.appState = {
            ...this.appState,
            ...result.enhancedSQLGeneratorState,
          };
          this.restoreUIState();
        }
      });
    } else {
      const saved = localStorage.getItem('enhancedSQLGeneratorState');
      if (saved) {
        try {
          this.appState = { ...this.appState, ...JSON.parse(saved) };
          this.restoreUIState();
        } catch (e) {
          console.warn('Failed to load saved state:', e);
        }
      }
    }
  }

  restoreUIState() {
    if (this.appState.databaseName) {
      const dbInput = document.getElementById('database-name');
      if (dbInput) dbInput.value = this.appState.databaseName;
    }

    if (this.appState.databaseType) {
      const dbTypeSelect = document.getElementById('database-type');
      if (dbTypeSelect) dbTypeSelect.value = this.appState.databaseType;
    }

    if (this.appState.tableName) {
      const tableInput = document.getElementById('table-name');
      if (tableInput) tableInput.value = this.appState.tableName;
    }

    if (this.appState.operationMode) {
      const modeRadio = document.getElementById(
        `mode-${this.appState.operationMode.toLowerCase()}`
      );
      if (modeRadio) modeRadio.checked = true;
    }

    // Determine current step based on state
    let currentStep = 1;
    if (this.appState.databaseName) currentStep = 2;
    if (this.appState.operationMode) currentStep = 3;
    if (this.appState.templateDownloaded) currentStep = 4;
    if (this.appState.uploadedFile) currentStep = 5;

    this.showStep(currentStep);
  }

  clearState() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(['enhancedSQLGeneratorState']);
    } else {
      localStorage.removeItem('enhancedSQLGeneratorState');
    }
  }

  // Placeholder methods for pagination (Step 5)
  previousPage() {
    // Implement pagination logic for large preview tables
    console.log('Previous page');
  }

  nextPage() {
    // Implement pagination logic for large preview tables
    console.log('Next page');
  }
}

// Function to check if all required modules are loaded
function areModulesLoaded() {
  return (
    typeof CSVParser !== 'undefined' &&
    typeof FieldMapper !== 'undefined' &&
    typeof SQLGenerator !== 'undefined' &&
    typeof ExportManager !== 'undefined'
  );
}

// Function to initialize application with retries
function initializeApplication(retries = 10) {
  if (areModulesLoaded()) {
    try {
      new EnhancedSQLGenerator();
      console.log('Application initialized successfully');
    } catch (error) {
      showInitializationError(error);
    }
  } else if (retries > 0) {
    console.log(`Waiting for modules to load... (${retries} retries left)`);
    setTimeout(() => initializeApplication(retries - 1), 200);
  } else {
    const moduleStatus = {
      CSVParser: typeof CSVParser !== 'undefined',
      FieldMapper: typeof FieldMapper !== 'undefined',
      SQLGenerator: typeof SQLGenerator !== 'undefined',
      ExportManager: typeof ExportManager !== 'undefined',
    };

    const missingModules = Object.entries(moduleStatus)
      .filter(([name, loaded]) => !loaded)
      .map(([name]) => name);

    const error = new Error(
      `模組載入失敗: ${missingModules.join(', ')} 未定義`
    );
    showInitializationError(error);
  }
}

// Function to show initialization error
function showInitializationError(error) {
  console.error('Application initialization failed:', error);

  // Fallback error display
  const errorContainer =
    document.getElementById('error-section') || document.body;
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
            background: #fee;
            border: 2px solid #f00;
            padding: 20px;
            margin: 20px;
            border-radius: 8px;
            color: #c00;
            font-weight: bold;
            text-align: center;
        `;
  errorDiv.innerHTML = `
            <h3>⚠️ 應用程序初始化失敗</h3>
            <p>錯誤: ${error.message}</p>
            <p>請嘗試以下解決方案:</p>
            <ul style="text-align: left; display: inline-block;">
                <li>重新整理頁面 (F5)</li>
                <li>清除瀏覽器快取</li>
                <li>檢查瀏覽器控制台是否有其他錯誤</li>
                <li>確認所有模組檔案存在於 js/ 目錄中</li>
                <li>檢查網路連線是否正常</li>
            </ul>
            <button onclick="location.reload()" style="
                background: #0066cc;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">重新整理頁面</button>
        `;

  if (errorContainer.id === 'error-section') {
    errorContainer.style.display = 'block';
    errorContainer.innerHTML = errorDiv.innerHTML;
  } else {
    errorContainer.appendChild(errorDiv);
  }
}

// Initialize application when DOM is loaded with module check
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, starting application initialization...');
  initializeApplication();
});

document.addEventListener('DOMContentLoaded', () => {
  // 如果是在類別外部
  const generator = new EnhancedSQLGenerator();
  generator.restartProcess();
});
