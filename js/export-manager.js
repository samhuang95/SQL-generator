/**
 * Export Manager Module
 * Handles SQL script export, download, and clipboard operations
 */

class ExportManager {
  constructor() {
    this.supportedFormats = ['sql', 'txt', 'json'];
    this.maxClipboardSize = 1024 * 1024; // 1MB limit for clipboard
    this.downloadHistory = [];
  }

  /**
   * Export SQL script with specified options
   * @param {Object} exportConfig - Export configuration
   * @returns {Object} - Export result
   */
  async exportSQL(exportConfig) {
    try {
      this.validateExportConfig(exportConfig);

      const {
        sql,
        metadata,
        format = 'sql',
        method = 'download', // 'download', 'clipboard', 'both'
        filename,
        options = {},
      } = exportConfig;

      let exportData;
      let actualFilename;

      // Prepare export data based on format
      switch (format.toLowerCase()) {
        case 'sql':
          exportData = sql;
          actualFilename = filename || this.generateFilename(metadata, 'sql');
          break;

        case 'txt':
          exportData = sql;
          actualFilename = filename || this.generateFilename(metadata, 'txt');
          break;

        case 'json':
          exportData = JSON.stringify(
            {
              metadata,
              sql,
              exportedAt: new Date().toISOString(),
            },
            null,
            2
          );
          actualFilename = filename || this.generateFilename(metadata, 'json');
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      const result = {
        success: false,
        method,
        format,
        filename: actualFilename,
        size: exportData.length,
        timestamp: new Date().toISOString(),
      };

      // Execute export method
      if (method === 'download' || method === 'both') {
        await this.downloadFile(exportData, actualFilename, format);
        result.downloaded = true;
      }

      if (method === 'clipboard' || method === 'both') {
        await this.copyToClipboard(exportData);
        result.copiedToClipboard = true;
      }

      result.success = true;

      // Add to download history
      this.addToHistory(result);

      return result;
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Download file to user's system
   * @param {string} content - File content
   * @param {string} filename - File name
   * @param {string} format - File format
   */
  async downloadFile(content, filename, format) {
    try {
      const mimeTypes = {
        sql: 'text/sql',
        txt: 'text/plain',
        json: 'application/json',
      };

      const mimeType = mimeTypes[format.toLowerCase()] || 'text/plain';

      // Create blob with UTF-8 BOM for better compatibility
      const blob = new Blob(['\ufeff' + content], {
        type: `${mimeType};charset=utf-8`,
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Copy content to clipboard
   * @param {string} content - Content to copy
   */
  async copyToClipboard(content) {
    try {
      // Check content size
      if (content.length > this.maxClipboardSize) {
        throw new Error(
          `Content too large for clipboard (${content.length} bytes, max ${this.maxClipboardSize})`
        );
      }

      // Use modern clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        // Fallback for older browsers
        await this.fallbackCopyToClipboard(content);
      }
    } catch (error) {
      throw new Error(`Clipboard operation failed: ${error.message}`);
    }
  }

  /**
   * Fallback clipboard method for older browsers
   * @param {string} content - Content to copy
   */
  async fallbackCopyToClipboard(content) {
    return new Promise((resolve, reject) => {
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (result) {
          resolve();
        } else {
          reject(new Error('Copy command failed'));
        }
      } catch (error) {
        document.body.removeChild(textArea);
        reject(error);
      }
    });
  }

  /**
   * Generate filename based on metadata
   * @param {Object} metadata - SQL generation metadata
   * @param {string} extension - File extension
   * @returns {string} - Generated filename
   */
  generateFilename(metadata, extension) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];

    const operation = metadata.operation.toLowerCase();
    const tableName = metadata.tableName || 'table';
    const database = metadata.databaseType || 'db';

    return `${operation}_${tableName}_${database}_${timestamp}.${extension}`;
  }

  /**
   * Validate export configuration
   * @param {Object} config - Export configuration to validate
   * @throws {Error} - If configuration is invalid
   */
  validateExportConfig(config) {
    if (!config.sql || typeof config.sql !== 'string') {
      throw new Error('SQL content is required and must be a string');
    }

    if (!config.metadata || typeof config.metadata !== 'object') {
      throw new Error('Metadata is required and must be an object');
    }

    if (
      config.format &&
      !this.supportedFormats.includes(config.format.toLowerCase())
    ) {
      throw new Error(
        `Unsupported format: ${config.format}. Supported: ${this.supportedFormats.join(', ')}`
      );
    }

    if (
      config.method &&
      !['download', 'clipboard', 'both'].includes(config.method)
    ) {
      throw new Error('Method must be "download", "clipboard", or "both"');
    }
  }

  /**
   * Get formatted size string
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size string
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Add export to history
   * @param {Object} result - Export result
   */
  addToHistory(result) {
    this.downloadHistory.unshift({
      id: Date.now(),
      filename: result.filename,
      format: result.format,
      method: result.method,
      size: result.size,
      sizeFormatted: this.formatSize(result.size),
      timestamp: result.timestamp,
      success: result.success,
    });

    // Keep only last 50 entries
    if (this.downloadHistory.length > 50) {
      this.downloadHistory = this.downloadHistory.slice(0, 50);
    }
  }

  /**
   * Get download history
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} - Download history entries
   */
  getHistory(limit = 10) {
    return this.downloadHistory.slice(0, limit);
  }

  /**
   * Clear download history
   */
  clearHistory() {
    this.downloadHistory = [];
  }

  /**
   * Create shareable configuration object
   * @param {Object} metadata - SQL generation metadata
   * @param {Object} options - Generation options
   * @returns {Object} - Shareable configuration
   */
  createShareableConfig(metadata, options) {
    return {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      configuration: {
        operation: metadata.operation,
        databaseType: metadata.databaseType,
        tableName: metadata.tableName,
        recordCount: metadata.recordCount,
        batchCount: metadata.batchCount,
        options: {
          batchSize: options.batchSize,
          includeTransaction: options.includeTransaction,
          includeComments: options.includeComments,
          includeCreateTable: options.includeCreateTable,
          insertMode: options.insertMode,
        },
      },
    };
  }

  /**
   * Export configuration as JSON
   * @param {Object} config - Configuration to export
   * @param {string} filename - Optional filename
   * @returns {Object} - Export result
   */
  async exportConfig(config, filename) {
    const configData = JSON.stringify(config, null, 2);
    const actualFilename = filename || `config_${Date.now()}.json`;

    await this.downloadFile(configData, actualFilename, 'json');

    return {
      success: true,
      filename: actualFilename,
      size: configData.length,
      method: 'download',
      format: 'json',
    };
  }

  /**
   * Check if clipboard API is supported
   * @returns {boolean} - True if clipboard API is supported
   */
  isClipboardSupported() {
    return !!(navigator.clipboard && window.isSecureContext);
  }

  /**
   * Get export statistics
   * @returns {Object} - Export statistics
   */
  getStatistics() {
    const total = this.downloadHistory.length;
    const successful = this.downloadHistory.filter((h) => h.success).length;
    const byFormat = {};
    const byMethod = {};
    let totalSize = 0;

    this.downloadHistory.forEach((entry) => {
      // Count by format
      byFormat[entry.format] = (byFormat[entry.format] || 0) + 1;

      // Count by method
      byMethod[entry.method] = (byMethod[entry.method] || 0) + 1;

      // Sum total size
      totalSize += entry.size;
    });

    return {
      total,
      successful,
      failed: total - successful,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      byFormat,
      byMethod,
      totalSize,
      totalSizeFormatted: this.formatSize(totalSize),
      averageSize: total > 0 ? Math.round(totalSize / total) : 0,
      averageSizeFormatted:
        total > 0 ? this.formatSize(Math.round(totalSize / total)) : '0 B',
    };
  }

  /**
   * Batch export multiple SQL scripts
   * @param {Array} exports - Array of export configurations
   * @returns {Object} - Batch export result
   */
  async batchExport(exports) {
    const results = {
      total: exports.length,
      successful: 0,
      failed: 0,
      results: [],
    };

    for (let i = 0; i < exports.length; i++) {
      try {
        const result = await this.exportSQL(exports[i]);
        results.results.push(result);
        results.successful++;
      } catch (error) {
        results.results.push({
          success: false,
          error: error.message,
          index: i,
        });
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Create ZIP archive of multiple exports (requires JSZip library)
   * @param {Array} exports - Array of export data
   * @param {string} zipFilename - ZIP filename
   * @returns {Object} - Export result
   */
  async createZipExport(exports, zipFilename) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library is required for ZIP export functionality');
    }

    try {
      const zip = new JSZip();

      exports.forEach((exportData, index) => {
        const filename = exportData.filename || `export_${index + 1}.sql`;
        zip.file(filename, exportData.content);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const actualFilename = zipFilename || `sql_exports_${Date.now()}.zip`;

      // Download the ZIP file
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = actualFilename;
      link.click();

      setTimeout(() => URL.revokeObjectURL(url), 100);

      return {
        success: true,
        filename: actualFilename,
        size: zipBlob.size,
        method: 'download',
        format: 'zip',
        fileCount: exports.length,
      };
    } catch (error) {
      throw new Error(`ZIP export failed: ${error.message}`);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportManager;
} else {
  window.ExportManager = ExportManager;
}
