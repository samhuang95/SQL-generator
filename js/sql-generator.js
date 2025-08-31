/**
 * SQL Generator Module
 * Generates SQL statements for different database types and operations
 */

class SQLGenerator {
  constructor() {
    this.supportedDatabases = ['mysql', 'postgresql', 'sqlite', 'sqlserver'];
    this.defaultBatchSize = 500;

    // SQL syntax variations for different databases
    this.syntaxMap = {
      mysql: {
        quoteChar: '`',
        stringQuote: "'",
        booleanTrue: 'TRUE',
        booleanFalse: 'FALSE',
        autoIncrement: 'AUTO_INCREMENT',
        primaryKey: 'PRIMARY KEY',
        createTable: 'CREATE TABLE IF NOT EXISTS',
        insertIgnore: 'INSERT IGNORE INTO',
        onDuplicateKey: 'ON DUPLICATE KEY UPDATE',
      },
      postgresql: {
        quoteChar: '"',
        stringQuote: "'",
        booleanTrue: 'TRUE',
        booleanFalse: 'FALSE',
        autoIncrement: 'SERIAL',
        primaryKey: 'PRIMARY KEY',
        createTable: 'CREATE TABLE IF NOT EXISTS',
        insertIgnore: 'INSERT INTO',
        onConflict: 'ON CONFLICT DO NOTHING',
      },
      sqlite: {
        quoteChar: '"',
        stringQuote: "'",
        booleanTrue: '1',
        booleanFalse: '0',
        autoIncrement: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        primaryKey: 'PRIMARY KEY',
        createTable: 'CREATE TABLE IF NOT EXISTS',
        insertIgnore: 'INSERT OR IGNORE INTO',
      },
      sqlserver: {
        quoteChar: '[',
        quoteCharEnd: ']',
        stringQuote: "'",
        booleanTrue: '1',
        booleanFalse: '0',
        autoIncrement: 'IDENTITY(1,1)',
        primaryKey: 'PRIMARY KEY',
        createTable: 'CREATE TABLE',
        insertIgnore: 'INSERT INTO',
      },
    };
  }

  /**
   * Generate complete SQL script for CSV import
   * @param {Object} config - Generation configuration
   * @returns {Object} - Generated SQL script and metadata
   */
  generateSQL(config) {
    this.validateConfig(config);

    const {
      operation,
      databaseName,
      tableName,
      databaseType,
      fieldMappings,
      csvData,
      options = {},
    } = config;

    const syntax = this.syntaxMap[databaseType.toLowerCase()];
    if (!syntax) {
      throw new Error(`Unsupported database type: ${databaseType}`);
    }

    let sqlScript = '';
    let metadata = {
      operation,
      databaseType,
      tableName,
      recordCount: 0,
      batchCount: 0,
      generatedAt: new Date().toISOString(),
    };

    // Add header comments if enabled
    if (options.includeComments !== false) {
      sqlScript += this.generateHeader(config, metadata);
    }

    // Add transaction wrapper if enabled
    if (options.includeTransaction !== false) {
      sqlScript += this.getTransactionStart(databaseType);
    }

    try {
      if (operation === 'INSERT') {
        const result = this.generateInsertSQL(config, syntax);
        sqlScript += result.sql;
        metadata.recordCount = result.recordCount;
        metadata.batchCount = result.batchCount;
      } else if (operation === 'UPDATE') {
        const result = this.generateUpdateSQL(config, syntax);
        sqlScript += result.sql;
        metadata.recordCount = result.recordCount;
        metadata.batchCount = result.batchCount;
      }

      // Close transaction if enabled
      if (options.includeTransaction !== false) {
        sqlScript += this.getTransactionEnd(databaseType);
      }

      // Add footer comments if enabled
      if (options.includeComments !== false) {
        sqlScript += this.generateFooter(metadata);
      }

      return {
        sql: sqlScript,
        metadata,
        success: true,
      };
    } catch (error) {
      // Rollback transaction on error
      if (options.includeTransaction !== false) {
        sqlScript += this.getTransactionRollback(databaseType);
      }

      throw new Error(`SQL generation failed: ${error.message}`);
    }
  }

  /**
   * Generate INSERT SQL statements
   * @param {Object} config - Configuration object
   * @param {Object} syntax - Database syntax configuration
   * @returns {Object} - Generated SQL and metadata
   */
  generateInsertSQL(config, syntax) {
    const { tableName, fieldMappings, csvData, options = {} } = config;
    const batchSize = parseInt(options.batchSize) || this.defaultBatchSize;

    let sql = '';
    let recordCount = 0;
    let batchCount = 0;

    // Generate CREATE TABLE statement if requested
    if (options.includeCreateTable) {
      sql += this.generateCreateTableSQL(tableName, fieldMappings, syntax);
      sql += '\n\n';
    }

    const fields = Object.keys(fieldMappings);
    const quotedFields = fields.map((field) =>
      this.quoteIdentifier(fieldMappings[field].sqlFieldName, syntax)
    );

    // Process data in batches
    const rows = csvData.rows || [];
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      if (batch.length === 0) continue;

      // Start INSERT statement
      const insertType =
        options.insertMode === 'ignore' ? syntax.insertIgnore : 'INSERT INTO';

      sql += `${insertType} ${this.quoteIdentifier(tableName, syntax)}\n`;
      sql += `  (${quotedFields.join(', ')})\nVALUES\n`;

      // Generate VALUES clauses
      const valueRows = [];
      batch.forEach((row) => {
        const values = fields.map((field) => {
          const value = row[field];
          const mapping = fieldMappings[field];
          return this.formatValue(value, mapping, syntax);
        });
        valueRows.push(`  (${values.join(', ')})`);
        recordCount++;
      });

      sql += valueRows.join(',\n');

      // Add ON DUPLICATE KEY UPDATE for MySQL if specified
      if (syntax.onDuplicateKey && options.insertMode === 'update') {
        sql += '\n' + this.generateOnDuplicateKeyUpdate(fieldMappings, syntax);
      }

      // Add ON CONFLICT for PostgreSQL if specified
      if (syntax.onConflict && options.insertMode === 'ignore') {
        sql += '\n' + syntax.onConflict;
      }

      sql += ';\n\n';
      batchCount++;
    }

    return { sql, recordCount, batchCount };
  }

  /**
   * Generate UPDATE SQL statements
   * @param {Object} config - Configuration object
   * @param {Object} syntax - Database syntax configuration
   * @returns {Object} - Generated SQL and metadata
   */
  generateUpdateSQL(config, syntax) {
    const { tableName, csvData, options = {} } = config;

    let sql = '';
    let recordCount = 0;
    let batchCount = 1;

    const rows = csvData.rows || [];

    rows.forEach((row) => {
      console.log('row:::', row);

      // 找出所有 WHERE 和 SET 欄位
      const whereFields = [];
      const setFields = [];

      Object.keys(row).forEach((key) => {
        console.log('key:::', key);
        if (key.endsWith('[WHERE]')) {
          const fieldName = key.replace('[WHERE]', '');
          const fieldValue = row[key];

          if (
            fieldValue !== null &&
            fieldValue !== undefined &&
            fieldValue !== ''
          ) {
            whereFields.push(
              `${this.quoteIdentifier(fieldName, syntax)} = ${this.quoteValue(fieldValue, syntax)}`
            );
          }
        } else if (key.endsWith('[SET]')) {
          const fieldName = key.replace('[SET]', '');
          const fieldValue = row[key];
          if (
            fieldValue !== null &&
            fieldValue !== undefined &&
            fieldValue !== ''
          ) {
            setFields.push(
              `${this.quoteIdentifier(fieldName, syntax)} = ${this.quoteValue(fieldValue, syntax)}`
            );
          }
        }
      });

      // 檢查是否有必要的 WHERE 和 SET 條件
      if (whereFields.length === 0) {
        throw new Error(
          'UPDATE mode requires at least one WHERE condition field (column name with [WHERE] suffix)'
        );
      }

      if (setFields.length === 0) {
        throw new Error(
          'UPDATE mode requires at least one SET field (column name with [SET] suffix)'
        );
      }

      // 生成 UPDATE SQL
      sql += `UPDATE ${this.quoteIdentifier(tableName, syntax)}\n`;
      sql += `SET ${setFields.join(', ')}\n`;
      sql += `WHERE ${whereFields.join(' AND ')};\n\n`;
      recordCount++;
    });

    return { sql, recordCount, batchCount };
  }

  quoteValue(value, syntax) {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    // 如果是數字，不需要引號
    if (typeof value === 'number' || !isNaN(value)) {
      return value.toString();
    }

    // 字串需要單引號，並處理特殊字符
    const stringValue = value.toString();

    switch (syntax) {
      case 'mysql':
        return `'${stringValue.replace(/'/g, "\\'")}'`;
      case 'postgresql':
        return `'${stringValue.replace(/'/g, "''")}'`;
      case 'sqlserver':
        return `'${stringValue.replace(/'/g, "''")}'`;
      case 'sqlite':
        return `'${stringValue.replace(/'/g, "''")}'`;
      default:
        return `'${stringValue.replace(/'/g, "''")}'`;
    }
  }

  /**
   * Generate CREATE TABLE SQL statement
   * @param {string} tableName - Table name
   * @param {Object} fieldMappings - Field mapping configuration
   * @param {Object} syntax - Database syntax configuration
   * @returns {string} - CREATE TABLE SQL
   */
  generateCreateTableSQL(tableName, fieldMappings, syntax) {
    let sql = `${syntax.createTable} ${this.quoteIdentifier(tableName, syntax)} (\n`;

    const columns = [];
    Object.entries(fieldMappings).forEach(([originalField, mapping]) => {
      const columnName = this.quoteIdentifier(mapping.sqlFieldName, syntax);
      let columnDef = `  ${columnName} ${mapping.sqlType}`;

      // Add constraints
      if (!mapping.nullable) {
        columnDef += ' NOT NULL';
      }

      columns.push(columnDef);
    });

    sql += columns.join(',\n');
    sql += '\n);';

    return sql;
  }

  /**
   * Generate ON DUPLICATE KEY UPDATE clause for MySQL
   * @param {Object} fieldMappings - Field mappings
   * @param {Object} syntax - Database syntax
   * @returns {string} - ON DUPLICATE KEY UPDATE clause
   */
  generateOnDuplicateKeyUpdate(fieldMappings, syntax) {
    const updates = [];
    Object.entries(fieldMappings).forEach(([originalField, mapping]) => {
      const quotedField = this.quoteIdentifier(mapping.sqlFieldName, syntax);
      updates.push(`${quotedField} = VALUES(${quotedField})`);
    });

    return `ON DUPLICATE KEY UPDATE\n  ${updates.join(',\n  ')}`;
  }

  /**
   * Format a value for SQL insertion
   * @param {*} value - The value to format
   * @param {Object} mapping - Field mapping information
   * @param {Object} syntax - Database syntax configuration
   * @returns {string} - Formatted SQL value
   */
  formatValue(value, mapping, syntax) {
    if (value === null || value === undefined || value === '') {
      return 'NULL';
    }

    const jsType = mapping.jsType;
    const stringValue = String(value).trim();

    switch (jsType) {
      case 'integer':
        return stringValue;

      case 'decimal':
        return stringValue;

      case 'boolean':
        const boolValue = stringValue.toLowerCase();
        if (['true', '1', 'yes', 'y'].includes(boolValue)) {
          return syntax.booleanTrue;
        } else {
          return syntax.booleanFalse;
        }

      case 'date':
      case 'datetime':
      case 'email':
      case 'string':
      default:
        // Escape single quotes by doubling them
        const escapedValue = stringValue.replace(/'/g, "''");
        return `${syntax.stringQuote}${escapedValue}${syntax.stringQuote}`;
    }
  }

  /**
   * Quote database identifier (table/column name)
   * @param {string} identifier - Identifier to quote
   * @param {Object} syntax - Database syntax configuration
   * @returns {string} - Quoted identifier
   */
  quoteIdentifier(identifier, syntax) {
    const endQuote = syntax.quoteCharEnd || syntax.quoteChar;
    return `${syntax.quoteChar}${identifier}${endQuote}`;
  }

  /**
   * Get transaction start statement
   * @param {string} databaseType - Database type
   * @returns {string} - Transaction start SQL
   */
  getTransactionStart(databaseType) {
    switch (databaseType.toLowerCase()) {
      case 'mysql':
        return 'START TRANSACTION;\n\n';
      case 'postgresql':
        return 'BEGIN;\n\n';
      case 'sqlite':
        return 'BEGIN TRANSACTION;\n\n';
      case 'sqlserver':
        return 'BEGIN TRANSACTION;\n\n';
      default:
        return 'BEGIN;\n\n';
    }
  }

  /**
   * Get transaction commit statement
   * @param {string} databaseType - Database type
   * @returns {string} - Transaction commit SQL
   */
  getTransactionEnd(databaseType) {
    return '\nCOMMIT;\n';
  }

  /**
   * Get transaction rollback statement
   * @param {string} databaseType - Database type
   * @returns {string} - Transaction rollback SQL
   */
  getTransactionRollback(databaseType) {
    return '\nROLLBACK;\n';
  }

  /**
   * Generate SQL header comments
   * @param {Object} config - Configuration
   * @param {Object} metadata - Generation metadata
   * @returns {string} - Header comments
   */
  generateHeader(config, metadata) {
    const { operation, databaseName, tableName, databaseType } = config;

    return (
      `-- =====================================================\n` +
      `-- Enhanced Import SQL Generator\n` +
      `-- Generated: ${metadata.generatedAt}\n` +
      `-- =====================================================\n` +
      `-- Operation: ${operation}\n` +
      `-- Database: ${databaseName}\n` +
      `-- Table: ${tableName}\n` +
      `-- Database Type: ${databaseType}\n` +
      `-- =====================================================\n\n`
    );
  }

  /**
   * Generate SQL footer comments
   * @param {Object} metadata - Generation metadata
   * @returns {string} - Footer comments
   */
  generateFooter(metadata) {
    return (
      `\n-- =====================================================\n` +
      `-- Summary:\n` +
      `-- Records processed: ${metadata.recordCount}\n` +
      `-- Batches generated: ${metadata.batchCount}\n` +
      `-- Completed: ${new Date().toISOString()}\n` +
      `-- =====================================================\n`
    );
  }

  /**
   * Validate configuration object
   * @param {Object} config - Configuration to validate
   * @throws {Error} - If configuration is invalid
   */
  validateConfig(config) {
    const required = [
      'operation',
      'databaseName',
      'tableName',
      'databaseType',
      'fieldMappings',
      'csvData',
    ];

    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }

    if (!this.supportedDatabases.includes(config.databaseType.toLowerCase())) {
      throw new Error(`Unsupported database type: ${config.databaseType}`);
    }

    if (!['INSERT', 'UPDATE'].includes(config.operation.toUpperCase())) {
      throw new Error(`Unsupported operation: ${config.operation}`);
    }

    if (!Array.isArray(config.csvData.rows)) {
      throw new Error('csvData.rows must be an array');
    }
  }

  /**
   * Get supported database types
   * @returns {Array} - Array of supported database types
   */
  getSupportedDatabases() {
    return [...this.supportedDatabases];
  }

  /**
   * Estimate SQL script size
   * @param {Object} config - Configuration object
   * @returns {Object} - Size estimation
   */
  estimateSize(config) {
    const { csvData, fieldMappings, options = {} } = config;
    const recordCount = csvData.rows ? csvData.rows.length : 0;
    const fieldCount = Object.keys(fieldMappings).length;
    const batchSize = parseInt(options.batchSize) || this.defaultBatchSize;
    const batchCount = Math.ceil(recordCount / batchSize);

    // Rough estimation based on average field lengths
    const avgFieldLength = 20;
    const estimatedSize =
      recordCount * fieldCount * avgFieldLength + batchCount * 100;

    return {
      recordCount,
      fieldCount,
      batchCount,
      estimatedSizeBytes: estimatedSize,
      estimatedSizeKB: Math.round(estimatedSize / 1024),
      estimatedSizeMB: Math.round((estimatedSize / (1024 * 1024)) * 100) / 100,
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SQLGenerator;
} else {
  window.SQLGenerator = SQLGenerator;
}
