/**
 * CSV Parser Module
 * Handles CSV file parsing, validation, and data processing
 */

class CSVParser {
  constructor() {
    this.supportedEncodings = ['UTF-8', 'UTF-16', 'Big5'];
    this.supportedDelimiters = [',', ';', '\t', '|'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxRows = 100000; // Safety limit
  }

  /**
   * Parse CSV text content
   * @param {string} csvText - Raw CSV text content
   * @param {Object} options - Parsing options
   * @returns {Object} - Parsed CSV data
   */
  parseCSVText(csvText, options = {}) {
    try {
      const {
        delimiter = null, // Auto-detect if null
        hasHeader = true,
        encoding = 'UTF-8',
        skipEmptyLines = true,
        trimValues = true,
      } = options;

      // Validate input
      if (!csvText || typeof csvText !== 'string') {
        throw new Error('Invalid CSV text input');
      }

      // Handle BOM (Byte Order Mark)
      const cleanedText = this.removeBOM(csvText);

      // Split into lines
      let lines = cleanedText.split(/\r?\n/);

      // Skip empty lines if requested
      if (skipEmptyLines) {
        lines = lines.filter((line) => line.trim() !== '');
      }

      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Detect delimiter if not specified
      const detectedDelimiter = delimiter || this.detectDelimiter(lines[0]);

      // Parse headers
      let headers = [];
      let dataStartIndex = 0;

      if (hasHeader) {
        headers = this.parseCSVLine(lines[0], detectedDelimiter, trimValues);
        dataStartIndex = 1;

        if (headers.length === 0) {
          throw new Error('No headers found in CSV file');
        }
      } else {
        // Generate default headers if no header row
        const firstRowData = this.parseCSVLine(
          lines[0],
          detectedDelimiter,
          trimValues
        );
        headers = firstRowData.map((_, index) => `Column_${index + 1}`);
      }

      // Parse data rows
      const rows = [];
      for (let i = dataStartIndex; i < lines.length; i++) {
        if (rows.length >= this.maxRows) {
          console.warn(
            `Reached maximum row limit (${this.maxRows}), truncating file`
          );
          break;
        }

        try {
          const rowData = this.parseCSVLine(
            lines[i],
            detectedDelimiter,
            trimValues
          );

          // Skip completely empty rows
          if (skipEmptyLines && rowData.every((cell) => cell === '')) {
            continue;
          }

          // Ensure row has same number of columns as headers
          while (rowData.length < headers.length) {
            rowData.push('');
          }

          rows.push(rowData);
        } catch (error) {
          console.warn(`Error parsing row ${i + 1}: ${error.message}`);
          // Continue with other rows instead of failing completely
        }
      }

      // Validate results
      if (headers.length === 0) {
        throw new Error('No valid columns found in CSV file');
      }

      return {
        headers: headers,
        rows: rows,
        totalRows: rows.length,
        columns: headers.length,
        delimiter: detectedDelimiter,
        encoding: encoding,
        metadata: {
          originalLineCount: lines.length,
          processedRows: rows.length,
          skippedRows: lines.length - rows.length - (hasHeader ? 1 : 0),
          hasHeader: hasHeader,
          maxColumnCount: Math.max(...rows.map((row) => row.length)),
        },
      };
    } catch (error) {
      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse a single CSV line with proper quote handling
   * @param {string} line - CSV line to parse
   * @param {string} delimiter - Field delimiter
   * @param {boolean} trimValues - Whether to trim whitespace
   * @returns {Array} - Array of field values
   */
  parseCSVLine(line, delimiter = ',', trimValues = true) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '"';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' || char === "'") {
        if (!inQuotes) {
          // Starting quote
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          if (nextChar === quoteChar) {
            // Escaped quote (double quote)
            current += char;
            i++; // Skip next character
          } else {
            // Ending quote
            inQuotes = false;
          }
        } else {
          // Quote character inside different quote type
          current += char;
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator outside quotes
        result.push(trimValues ? current.trim() : current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    result.push(trimValues ? current.trim() : current);

    return result;
  }

  /**
   * Auto-detect CSV delimiter
   * @param {string} line - Sample line to analyze
   * @returns {string} - Detected delimiter
   */
  detectDelimiter(line) {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let bestDelimiter = ',';

    for (const delimiter of delimiters) {
      const count = this.countDelimiterOccurrences(line, delimiter);
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  /**
   * Count delimiter occurrences outside quotes
   * @param {string} line - Line to analyze
   * @param {string} delimiter - Delimiter to count
   * @returns {number} - Number of occurrences
   */
  countDelimiterOccurrences(line, delimiter) {
    let count = 0;
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        if (line[i + 1] === quoteChar) {
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else if (char === delimiter && !inQuotes) {
        count++;
      }
    }

    return count;
  }

  /**
   * Remove Byte Order Mark (BOM) from text
   * @param {string} text - Text to clean
   * @returns {string} - Text without BOM
   */
  removeBOM(text) {
    // UTF-8 BOM
    if (text.charCodeAt(0) === 0xfeff) {
      return text.substring(1);
    }

    // UTF-8 BOM as bytes
    if (text.substring(0, 3) === String.fromCharCode(0xef, 0xbb, 0xbf)) {
      return text.substring(3);
    }

    return text;
  }

  /**
   * Validate CSV file structure and content
   * @param {Object} csvData - Parsed CSV data
   * @returns {Object} - Validation result
   */
  validateCSV(csvData) {
    const errors = [];
    const warnings = [];

    try {
      // Basic structure validation
      if (!csvData.headers || csvData.headers.length === 0) {
        errors.push('No headers found in CSV file');
      }

      if (!csvData.rows || csvData.rows.length === 0) {
        errors.push('No data rows found in CSV file');
      }

      // Header validation
      if (csvData.headers) {
        csvData.headers.forEach((header, index) => {
          if (!header || header.trim() === '') {
            errors.push(`Header ${index + 1} is empty`);
          }
        });

        // Check for duplicate headers
        const headerSet = new Set();
        csvData.headers.forEach((header, index) => {
          if (headerSet.has(header.toLowerCase())) {
            warnings.push(`Duplicate header found: "${header}"`);
          }
          headerSet.add(header.toLowerCase());
        });
      }

      // Row validation
      if (csvData.rows) {
        const expectedColumnCount = csvData.headers
          ? csvData.headers.length
          : 0;
        let inconsistentRows = 0;

        csvData.rows.forEach((row, index) => {
          if (row.length !== expectedColumnCount) {
            inconsistentRows++;
            if (inconsistentRows <= 5) {
              // Only report first 5 inconsistencies
              warnings.push(
                `Row ${index + 2} has ${row.length} columns, expected ${expectedColumnCount}`
              );
            }
          }
        });

        if (inconsistentRows > 5) {
          warnings.push(
            `${inconsistentRows - 5} more rows have column count inconsistencies`
          );
        }
      }

      // Size validation
      if (csvData.totalRows > this.maxRows) {
        warnings.push(
          `File has ${csvData.totalRows} rows, which exceeds recommended limit of ${this.maxRows}`
        );
      }

      if (csvData.columns > 100) {
        warnings.push(
          `File has ${csvData.columns} columns, which may impact performance`
        );
      }
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      summary: {
        totalRows: csvData.totalRows || 0,
        totalColumns: csvData.columns || 0,
        delimiter: csvData.delimiter || ',',
        encoding: csvData.encoding || 'UTF-8',
      },
    };
  }

  /**
   * Detect CSV template type from headers and content
   * @param {Object} csvData - Parsed CSV data
   * @returns {Object} - Template detection result
   */
  detectTemplateType(csvData) {
    if (!csvData.headers || csvData.headers.length === 0) {
      return {
        type: 'unknown',
        confidence: 0,
        reason: 'No headers found',
      };
    }

    const headers = csvData.headers.map((h) => h.toLowerCase());

    // Check for UPDATE template patterns
    const updatePatterns = [
      'where_condition',
      'set_values',
      '_where',
      '_set',
      '[where]',
      '[set]',
    ];
    const updateMatches = updatePatterns.filter((pattern) =>
      headers.some((header) => header.includes(pattern))
    ).length;

    if (updateMatches >= 2) {
      return {
        type: 'UPDATE',
        confidence: Math.min(updateMatches / 2, 1.0),
        reason: `Found ${updateMatches} UPDATE-specific patterns`,
      };
    }

    // Check for INSERT template patterns
    const insertPatterns = ['id', 'name', 'email', 'created', 'updated'];
    const insertMatches = insertPatterns.filter((pattern) =>
      headers.some((header) => header.includes(pattern))
    ).length;

    if (insertMatches >= 2) {
      return {
        type: 'INSERT',
        confidence: Math.min(insertMatches / insertPatterns.length, 1.0),
        reason: `Found ${insertMatches} common INSERT patterns`,
      };
    }

    // Default to INSERT if uncertain but has data
    if (csvData.totalRows > 0) {
      return {
        type: 'INSERT',
        confidence: 0.5,
        reason: 'Default assumption based on data presence',
      };
    }

    return {
      type: 'unknown',
      confidence: 0,
      reason: 'Unable to determine template type',
    };
  }

  /**
   * Get CSV parsing statistics
   * @param {Object} csvData - Parsed CSV data
   * @returns {Object} - Statistics object
   */
  getStatistics(csvData) {
    if (!csvData) {
      return {
        isEmpty: true,
        message: 'No data available',
      };
    }

    const stats = {
      isEmpty: false,
      totalRows: csvData.totalRows || 0,
      totalColumns: csvData.columns || 0,
      delimiter: csvData.delimiter || ',',
      encoding: csvData.encoding || 'UTF-8',
      hasHeader: csvData.metadata?.hasHeader || false,
      originalLineCount: csvData.metadata?.originalLineCount || 0,
      skippedRows: csvData.metadata?.skippedRows || 0,
    };

    // Calculate field statistics
    if (csvData.rows && csvData.rows.length > 0) {
      stats.fieldStats = {};
      csvData.headers.forEach((header, index) => {
        const values = csvData.rows.map((row) => row[index] || '');
        const nonEmptyValues = values.filter((v) => v.trim() !== '');

        stats.fieldStats[header] = {
          totalValues: values.length,
          nonEmptyValues: nonEmptyValues.length,
          emptyRate: (values.length - nonEmptyValues.length) / values.length,
          maxLength: Math.max(...nonEmptyValues.map((v) => v.length), 0),
          avgLength:
            nonEmptyValues.length > 0
              ? Math.round(
                  nonEmptyValues.reduce((sum, v) => sum + v.length, 0) /
                    nonEmptyValues.length
                )
              : 0,
        };
      });
    }

    return stats;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CSVParser;
} else {
  window.CSVParser = CSVParser;
}
