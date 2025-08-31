/**
 * Field Mapper Module
 * Handles CSV field analysis and SQL type mapping
 */

class FieldMapper {
  constructor() {
    this.typePatterns = {
      integer: /^-?\d+$/,
      decimal: /^-?\d+\.\d+$/,
      boolean: /^(true|false|1|0|yes|no|y|n)$/i,
      date: /^\d{4}-\d{2}-\d{2}$/,
      datetime: /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    };

    this.sqlTypes = {
      integer: 'INT',
      decimal: 'DECIMAL(10,2)',
      boolean: 'BOOLEAN',
      date: 'DATE',
      datetime: 'DATETIME',
      email: 'VARCHAR(255)',
      shortText: 'VARCHAR(255)',
      longText: 'TEXT',
      unknown: 'VARCHAR(255)',
    };
  }

  /**
   * Analyze CSV data and generate field mappings
   * @param {Object} csvData - Parsed CSV data from CSVParser
   * @returns {Object} - Field mapping configuration
   */
  generateMapping(csvData) {
    if (!csvData || !csvData.headers || !csvData.rows) {
      throw new Error('Invalid CSV data provided for mapping');
    }

    const fieldMappings = {};

    csvData.headers.forEach((header, index) => {
      const columnData = csvData.rows.map(
        (row) => Object.values(row)[index] || ''
      );

      const fieldAnalysis = this.analyzeField(header, columnData);
      fieldMappings[header] = {
        sqlFieldName: this.sanitizeFieldName(header),
        sqlType: fieldAnalysis.sqlType,
        jsType: fieldAnalysis.jsType,
        confidence: fieldAnalysis.confidence,
        nullable: fieldAnalysis.hasNulls,
        maxLength: fieldAnalysis.maxLength,
        sampleValues: columnData.slice(0, 3).filter((v) => v),
      };
    });

    return fieldMappings;
  }

  /**
   * Analyze a single field to determine its data type
   * @param {string} fieldName - Name of the field
   * @param {Array} values - Array of values in the field
   * @returns {Object} - Field analysis result
   */
  analyzeField(fieldName, values) {
    const nonEmptyValues = values.filter(
      (v) => v !== null && v !== undefined && v !== ''
    );
    const hasNulls = nonEmptyValues.length < values.length;
    const maxLength = Math.max(...nonEmptyValues.map((v) => String(v).length));

    if (nonEmptyValues.length === 0) {
      return {
        jsType: 'string',
        sqlType: this.sqlTypes.unknown,
        confidence: 0.0,
        hasNulls: true,
        maxLength: 0,
      };
    }

    // Check type patterns in order of specificity
    const typeChecks = [
      { type: 'integer', pattern: this.typePatterns.integer },
      { type: 'decimal', pattern: this.typePatterns.decimal },
      { type: 'boolean', pattern: this.typePatterns.boolean },
      { type: 'datetime', pattern: this.typePatterns.datetime },
      { type: 'date', pattern: this.typePatterns.date },
      { type: 'email', pattern: this.typePatterns.email },
    ];

    for (const check of typeChecks) {
      const matches = nonEmptyValues.filter((v) =>
        check.pattern.test(String(v).trim())
      );
      const confidence = matches.length / nonEmptyValues.length;

      if (confidence >= 0.8) {
        // 80% confidence threshold
        return {
          jsType: check.type,
          sqlType: this.sqlTypes[check.type],
          confidence: confidence,
          hasNulls: hasNulls,
          maxLength: maxLength,
        };
      }
    }

    // Determine string type based on content analysis
    const stringType = this.determineStringType(nonEmptyValues, maxLength);

    return {
      jsType: 'string',
      sqlType: stringType,
      confidence: 1.0,
      hasNulls: hasNulls,
      maxLength: maxLength,
    };
  }

  /**
   * Determine appropriate string SQL type based on content
   * @param {Array} values - Non-empty values
   * @param {number} maxLength - Maximum string length
   * @returns {string} - SQL type for string data
   */
  determineStringType(values, maxLength) {
    // Check for email patterns
    if (values.some((v) => this.typePatterns.email.test(v))) {
      return this.sqlTypes.email;
    }

    // Determine based on length
    if (maxLength > 500) {
      return this.sqlTypes.longText;
    } else if (maxLength > 255) {
      return 'VARCHAR(500)';
    } else {
      return this.sqlTypes.shortText;
    }
  }

  /**
   * Sanitize field name for SQL compatibility
   * @param {string} fieldName - Original field name
   * @returns {string} - SQL-compatible field name
   */
  sanitizeFieldName(fieldName) {
    return fieldName
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]/g, '_') // Allow Chinese characters
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .replace(/_+/g, '_') // Collapse multiple underscores
      .substring(0, 64); // Limit length for SQL compatibility
  }

  /**
   * Validate field mapping configuration
   * @param {Object} fieldMappings - Field mappings to validate
   * @returns {Object} - Validation result
   */
  validateMappings(fieldMappings) {
    const errors = [];
    const warnings = [];
    const usedSqlNames = new Set();

    Object.entries(fieldMappings).forEach(([originalName, mapping]) => {
      // Check for duplicate SQL field names
      if (usedSqlNames.has(mapping.sqlFieldName)) {
        errors.push(`Duplicate SQL field name: ${mapping.sqlFieldName}`);
      } else {
        usedSqlNames.add(mapping.sqlFieldName);
      }

      // Check for low confidence mappings
      if (mapping.confidence < 0.5) {
        warnings.push(
          `Low confidence mapping for field: ${originalName} (${(mapping.confidence * 100).toFixed(0)}%)`
        );
      }

      // Check for very long field names
      if (mapping.sqlFieldName.length > 64) {
        errors.push(`SQL field name too long: ${mapping.sqlFieldName}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  }

  /**
   * Get suggested improvements for field mappings
   * @param {Object} fieldMappings - Current field mappings
   * @returns {Array} - Array of suggestions
   */
  getSuggestions(fieldMappings) {
    const suggestions = [];

    Object.entries(fieldMappings).forEach(([originalName, mapping]) => {
      // Suggest primary key candidates
      if (
        originalName.toLowerCase().includes('id') &&
        mapping.jsType === 'integer'
      ) {
        suggestions.push({
          type: 'primary_key',
          field: originalName,
          message: `Consider making '${originalName}' a PRIMARY KEY`,
        });
      }

      // Suggest indexes for potential lookup fields
      if (
        originalName.toLowerCase().includes('email') ||
        originalName.toLowerCase().includes('name')
      ) {
        suggestions.push({
          type: 'index',
          field: originalName,
          message: `Consider adding an INDEX on '${originalName}' for better query performance`,
        });
      }

      // Suggest NOT NULL constraints for fields with no nulls
      if (!mapping.nullable) {
        suggestions.push({
          type: 'constraint',
          field: originalName,
          message: `Consider adding NOT NULL constraint to '${originalName}'`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Export mapping configuration as JSON
   * @param {Object} fieldMappings - Field mappings to export
   * @returns {string} - JSON string of configuration
   */
  exportMappingConfig(fieldMappings) {
    return JSON.stringify(fieldMappings, null, 2);
  }

  /**
   * Import mapping configuration from JSON
   * @param {string} configJson - JSON configuration string
   * @returns {Object} - Parsed field mappings
   */
  importMappingConfig(configJson) {
    try {
      const config = JSON.parse(configJson);
      const validation = this.validateMappings(config);

      if (!validation.isValid) {
        throw new Error(
          'Invalid mapping configuration: ' + validation.errors.join(', ')
        );
      }

      return config;
    } catch (error) {
      throw new Error(
        'Failed to import mapping configuration: ' + error.message
      );
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FieldMapper;
} else {
  window.FieldMapper = FieldMapper;
}
