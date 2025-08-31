/**
 * UpdateOperationHandler - Handles UPDATE SQL operations
 * Manages SET clause building and WHERE condition construction
 */
class UpdateOperationHandler {
    constructor() {
        this.tableName = '';
        this.setFields = [];
        this.whereConditions = [];
        this.validationErrors = [];
    }

    /**
     * Set the target table name
     * @param {string} tableName - Name of the table to update
     */
    setTableName(tableName) {
        if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
            throw new Error('Table name is required and must be a non-empty string');
        }
        this.tableName = tableName.trim();
    }

    /**
     * Add a field to the SET clause
     * @param {string} fieldName - Name of the field to update
     * @param {*} value - New value for the field
     * @param {string} dataType - Data type of the field
     */
    addSetField(fieldName, value, dataType = 'string') {
        if (!fieldName || typeof fieldName !== 'string' || fieldName.trim() === '') {
            throw new Error('Field name is required and must be a non-empty string');
        }

        // Remove existing field with same name
        this.setFields = this.setFields.filter(field => field.name !== fieldName.trim());

        // Add new field
        this.setFields.push({
            name: fieldName.trim(),
            value: value,
            dataType: dataType
        });
    }

    /**
     * Remove a field from the SET clause
     * @param {string} fieldName - Name of the field to remove
     */
    removeSetField(fieldName) {
        this.setFields = this.setFields.filter(field => field.name !== fieldName);
    }

    /**
     * Add a WHERE condition
     * @param {string} fieldName - Name of the field
     * @param {string} operator - Comparison operator (=, !=, <, >, <=, >=, LIKE, IN)
     * @param {*} value - Value to compare against
     * @param {string} dataType - Data type of the field
     * @param {string} logicalOperator - Logical operator (AND, OR) for chaining conditions
     */
    addWhereCondition(fieldName, operator, value, dataType = 'string', logicalOperator = 'AND') {
        if (!fieldName || typeof fieldName !== 'string' || fieldName.trim() === '') {
            throw new Error('Field name is required for WHERE condition');
        }

        const validOperators = ['=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL'];
        if (!validOperators.includes(operator.toUpperCase())) {
            throw new Error(`Invalid operator: ${operator}. Valid operators are: ${validOperators.join(', ')}`);
        }

        const validLogicalOperators = ['AND', 'OR'];
        if (!validLogicalOperators.includes(logicalOperator.toUpperCase())) {
            throw new Error(`Invalid logical operator: ${logicalOperator}. Valid operators are: ${validLogicalOperators.join(', ')}`);
        }

        this.whereConditions.push({
            fieldName: fieldName.trim(),
            operator: operator.toUpperCase(),
            value: value,
            dataType: dataType,
            logicalOperator: logicalOperator.toUpperCase()
        });
    }

    /**
     * Remove a WHERE condition by index
     * @param {number} index - Index of the condition to remove
     */
    removeWhereCondition(index) {
        if (index >= 0 && index < this.whereConditions.length) {
            this.whereConditions.splice(index, 1);
        }
    }

    /**
     * Clear all WHERE conditions
     */
    clearWhereConditions() {
        this.whereConditions = [];
    }

    /**
     * Clear all SET fields
     */
    clearSetFields() {
        this.setFields = [];
    }

    /**
     * Get all SET fields
     * @returns {Array} Array of SET field objects
     */
    getSetFields() {
        return [...this.setFields];
    }

    /**
     * Get all WHERE conditions
     * @returns {Array} Array of WHERE condition objects
     */
    getWhereConditions() {
        return [...this.whereConditions];
    }

    /**
     * Validate the current configuration
     * @returns {boolean} True if valid, false otherwise
     */
    validate() {
        this.validationErrors = [];

        // Check table name
        if (!this.tableName) {
            this.validationErrors.push('Table name is required');
        }

        // Check if at least one SET field is provided
        if (this.setFields.length === 0) {
            this.validationErrors.push('At least one SET field is required for UPDATE operation');
        }

        // Check if WHERE conditions are provided (safety check)
        if (this.whereConditions.length === 0) {
            this.validationErrors.push('WHERE conditions are strongly recommended to prevent updating all rows');
        }

        // Validate SET fields
        this.setFields.forEach((field, index) => {
            if (!field.name) {
                this.validationErrors.push(`SET field at index ${index} is missing a name`);
            }
            if (field.value === undefined) {
                this.validationErrors.push(`SET field '${field.name}' is missing a value`);
            }
        });

        // Validate WHERE conditions
        this.whereConditions.forEach((condition, index) => {
            if (!condition.fieldName) {
                this.validationErrors.push(`WHERE condition at index ${index} is missing a field name`);
            }
            if (!['IS NULL', 'IS NOT NULL'].includes(condition.operator) && condition.value === undefined) {
                this.validationErrors.push(`WHERE condition '${condition.fieldName}' is missing a value`);
            }
        });

        return this.validationErrors.length === 0;
    }

    /**
     * Get validation errors
     * @returns {Array<string>} Array of error messages
     */
    getValidationErrors() {
        return [...this.validationErrors];
    }

    /**
     * Format value based on data type for SQL
     * @param {*} value - The value to format
     * @param {string} dataType - The data type
     * @returns {string} Formatted value for SQL
     */
    formatValueForSQL(value, dataType) {
        if (value === null || value === undefined) {
            return 'NULL';
        }

        switch (dataType.toLowerCase()) {
            case 'string':
            case 'text':
            case 'varchar':
                return `'${String(value).replace(/'/g, "''")}'`;
            
            case 'number':
            case 'integer':
            case 'int':
            case 'float':
            case 'decimal':
                return String(value);
            
            case 'boolean':
            case 'bool':
                return value ? 'TRUE' : 'FALSE';
            
            case 'null':
                return 'NULL';
            
            default:
                // Default to string formatting for unknown types
                return `'${String(value).replace(/'/g, "''")}'`;
        }
    }

    /**
     * Generate SET clause for the UPDATE statement
     * @returns {string} The SET clause
     */
    generateSetClause() {
        return this.setFields
            .map(field => `${field.name} = ${this.formatValueForSQL(field.value, field.dataType)}`)
            .join(', ');
    }

    /**
     * Generate WHERE clause for the UPDATE statement
     * @returns {string} The WHERE clause
     */
    generateWhereClause() {
        if (this.whereConditions.length === 0) {
            return '';
        }

        let whereClause = '';
        
        this.whereConditions.forEach((condition, index) => {
            if (index > 0) {
                whereClause += ` ${condition.logicalOperator} `;
            }

            const fieldName = condition.fieldName;
            const operator = condition.operator;

            if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
                whereClause += `${fieldName} ${operator}`;
            } else if (operator === 'IN' || operator === 'NOT IN') {
                // Handle IN operator - value should be an array
                if (Array.isArray(condition.value)) {
                    const values = condition.value
                        .map(val => this.formatValueForSQL(val, condition.dataType))
                        .join(', ');
                    whereClause += `${fieldName} ${operator} (${values})`;
                } else {
                    // Single value - treat as equals
                    whereClause += `${fieldName} = ${this.formatValueForSQL(condition.value, condition.dataType)}`;
                }
            } else {
                whereClause += `${fieldName} ${operator} ${this.formatValueForSQL(condition.value, condition.dataType)}`;
            }
        });

        return whereClause;
    }

    /**
     * Generate UPDATE SQL statement
     * @returns {string} The generated SQL UPDATE statement
     * @throws {Error} If validation fails
     */
    generateSQL() {
        if (!this.validate()) {
            throw new Error('Validation failed: ' + this.validationErrors.join(', '));
        }

        const setClause = this.generateSetClause();
        const whereClause = this.generateWhereClause();

        let sql = `UPDATE ${this.tableName} SET ${setClause}`;
        
        if (whereClause) {
            sql += ` WHERE ${whereClause}`;
        }

        sql += ';';

        return sql;
    }

    /**
     * Reset the handler to initial state
     */
    reset() {
        this.tableName = '';
        this.setFields = [];
        this.whereConditions = [];
        this.validationErrors = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UpdateOperationHandler;
}