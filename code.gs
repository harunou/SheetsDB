/**
 * Database-like operations for Google Sheets with V8 runtime support
 *
 * Version: V8
 *
 * Usage:
 *   const db = SheetsDB.connect(SpreadsheetApp.getActiveSpreadsheet());
 *   const table = db.table('Sheet1');
 *   const data = table.get();
 */

// =============================================================================
// CONVERTER - Data Type Conversion Module
// =============================================================================

/**
 * Converter - Handles data type conversions between JS and Sheets
 */
const Converter = {
  // Separator for array values
  separator: '\n',

  /**
   * Number converter
   */
  N(value, write) {
    if (write) {
      return value != null ? value.toString() : '';
    } else {
      if (value === '' || value == null) return null;
      const num = Number(value);
      return isNaN(num) ? null : num;
    }
  },

  /**
   * String converter
   */
  S(value, write) {
    return value != null ? String(value) : '';
  },

  /**
   * Array converter
   */
  A(value, write) {
    if (write) {
      if (Array.isArray(value)) {
        return value.join(Converter.separator);
      }
      return value != null ? String(value) : '';
    } else {
      if (value === '' || value == null) return [];
      return String(value).split(Converter.separator);
    }
  },

  /**
   * Object converter (JSON)
   */
  O(value, write) {
    if (write) {
      if (value == null) return '';
      if (typeof value === 'object') {
        try {
          return Object.keys(value).length > 0 ? JSON.stringify(value) : '';
        } catch (error) {
          console.error('Error stringifying object:', error);
          return '';
        }
      }
      return String(value);
    } else {
      if (value === '' || value == null) return {};
      try {
        return JSON.parse(String(value));
      } catch (error) {
        console.error('Error parsing JSON:', error);
        return {};
      }
    }
  },

  /**
   * Date converter
   */
  D(value, write) {
    if (write) {
      if (value == null) return '';
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? '' : date.toISOString();
      }
      return String(value);
    } else {
      if (value === '' || value == null) return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
  },

  /**
   * Boolean converter
   */
  B(value, write) {
    if (write) {
      return value != null ? String(Boolean(value)) : '';
    } else {
      if (value === '' || value == null) return false;
      const str = String(value).toLowerCase();
      return str === 'true' || str === '1' || str === 'yes';
    }
  },

  /**
   * No-operation converter
   */
  noop(value, write) {
    return value;
  },

  /**
   * Gets converter function by type
   */
  getConverter(type) {
    if (typeof type === 'function') {
      return type;
    }

    if (typeof type === 'string' && typeof Converter[type] === 'function') {
      return Converter[type];
    }

    return Converter.noop;
  }
};

// =============================================================================
// UTILITIES - Helper Functions
// =============================================================================

/**
 * Utilities - Helper functions for SheetsDB
 */
const Utilities = {
  /**
   * Gets the type of an object (improved version for V8)
   */
  getType(obj) {
    if (obj === null) return 'Null';
    if (obj === undefined) return 'Undefined';

    // For Google Apps Script objects
    if (typeof obj === 'object' && obj.toString) {
      const str = obj.toString();
      if (str === 'Spreadsheet' || str === 'Sheet' || str.includes('GoogleAppsScript')) {
        return 'JavaObject';
      }
    }

    return Object.prototype.toString.call(obj).slice(8, -1);
  },

  /**
   * Finds a sheet by ID
   */
  getSheetById(spreadsheet, id) {
    const sheets = spreadsheet.getSheets();

    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId() === id) {
        return sheets[i];
      }
    }

    return null;
  },

  /**
   * Finds a sheet by name
   */
  getSheetByName(spreadsheet, name) {
    return spreadsheet.getSheetByName(name);
  },

  /**
   * Finds a sheet by reference (name or ID)
   */
  findSheet(spreadsheet, ref) {
    const refType = Utilities.getType(ref);

    if (refType === 'Number') {
      return Utilities.getSheetById(spreadsheet, ref);
    } else if (refType === 'String') {
      return Utilities.getSheetByName(spreadsheet, ref);
    }

    return null;
  },

  /**
   * Converts objects to 2D array format for sheets
   */
  getArrays(objects, keys, types) {
    const arrays = [];

    for (let i = 0; i < objects.length; i++) {
      arrays.push(Utilities.getArray(objects[i], keys, types));
    }

    return arrays;
  },

  /**
   * Converts a single object to array format
   */
  getArray(object, keys, types) {
    const array = new Array(keys.length);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = object[key];
      const converter = Converter.getConverter(types[key]);

      array[i] = value != null ? converter(value, true) : null;
    }

    return array;
  },

  /**
   * Converts 2D array to objects
   */
  getObjects(arrays, keys, types) {
    const objects = [];

    for (let i = 0; i < arrays.length; i++) {
      const row = arrays[i];
      const object = {};
      let hasData = false;

      for (let j = 0; j < row.length && j < keys.length; j++) {
        const key = keys[j];
        const value = row[j];

        if (key === null) continue;

        const converter = Converter.getConverter(types[key]);
        const convertedValue = converter(value, false);

        if (convertedValue !== '' && convertedValue != null) {
          object[key] = convertedValue;
          hasData = true;
        }
      }

      if (hasData) {
        objects.push(object);
      }
    }

    return objects;
  },

  /**
   * Converts headers to camelCase keys
   */
  headersToKeys(headers) {
    const keys = [];
    const usedKeys = new Set();

    for (let i = 0; i < headers.length; i++) {
      let key = Utilities.headerToKey(headers[i]);

      // Handle duplicate or empty keys
      if (key === '' || usedKeys.has(key)) {
        key = null;
      } else {
        usedKeys.add(key);
      }

      keys.push(key);
    }

    return keys;
  },

  /**
   * Converts a header string to camelCase key
   */
  headerToKey(header) {
    if (typeof header !== 'string') return '';

    return header
      .replace(/^[\d,\s]+|[^\w\s]+|\s+$/g, '') // Remove numbers, special chars, leading/trailing spaces
      .replace(/^\w/, match => match.toLowerCase()) // First char to lowercase
      .replace(/\s+\w/g, match => match.trim().toUpperCase()) // Subsequent words to uppercase
      .replace(/\s+/g, ''); // Remove remaining spaces
  },

  /**
   * Parses type definitions, converting header names to keys
   */
  parseTypes(types) {
    if (!types || typeof types !== 'object') {
      return {};
    }

    const result = {};

    for (const header in types) {
      if (types.hasOwnProperty(header)) {
        const key = Utilities.headerToKey(header);
        if (key) {
          result[key] = types[header];
        }
      }
    }

    return result;
  },

  /**
   * Calculates storage used by a sheet
   */
  storageUsed(sheet) {
    return sheet.getMaxRows() * sheet.getMaxColumns();
  },

  /**
   * Optimizes storage usage for a sheet
   */
  storageOptimize(sheet, params) {
    // Default parameters
    const options = {
      headerFreeze: true,
      headerBold: true,
      headerRows: 1,
      marginRight: 1,
      marginBottom: 1,
      ...params
    };

    try {
      // Adjust rows
      const lastRow = sheet.getLastRow() || 2;
      const maxRows = sheet.getMaxRows();
      const targetRows = lastRow + options.marginBottom;

      if (maxRows > targetRows) {
        const rowsToDelete = maxRows - targetRows;
        sheet.deleteRows(targetRows + 1, rowsToDelete);
      } else if (maxRows < targetRows) {
        const rowsToAdd = targetRows - maxRows;
        sheet.insertRowsAfter(maxRows, rowsToAdd);
      }

      // Adjust columns
      const lastColumn = sheet.getLastColumn() || 2;
      const maxColumns = sheet.getMaxColumns();
      const targetColumns = lastColumn + options.marginRight;

      if (maxColumns > targetColumns) {
        const columnsToDelete = maxColumns - targetColumns;
        sheet.deleteColumns(targetColumns + 1, columnsToDelete);
      } else if (maxColumns < targetColumns) {
        const columnsToAdd = targetColumns - maxColumns;
        sheet.insertColumnsAfter(maxColumns, columnsToAdd);
      }

      // Freeze headers
      if (options.headerFreeze && options.headerRows > 0) {
        sheet.setFrozenRows(options.headerRows);
      }

      // Bold headers
      if (options.headerBold && options.headerRows > 0 && lastColumn > 0) {
        const headerRange = sheet.getRange(1, 1, options.headerRows, lastColumn);
        headerRange.setFontWeight('bold');
      }

    } catch (error) {
      console.error('Error optimizing sheet storage:', error);
    }
  }
};

// =============================================================================
// SHEETS PROCESSOR - Data Processing Module
// =============================================================================

/**
 * SheetsProcessor - Handles data operations with Google Sheets
 */
const SheetsProcessor = {
  /**
   * Gets all row data from a sheet as objects
   */
  getRowsData(sheet, types) {
    const dataRange = sheet.getDataRange();

    if (dataRange.getNumRows() <= 1) {
      return []; // No data rows, only headers or empty sheet
    }

    const rows = dataRange.getValues();
    const headers = rows.shift(); // Remove and get headers

    return Utilities.getObjects(rows, Utilities.headersToKeys(headers), types);
  },

  /**
   * Sets row data in a sheet, replacing existing data
   */
  setRowsData(sheet, objects, types) {
    if (!objects || objects.length === 0) {
      return;
    }

    const dataRange = sheet.getDataRange();

    if (dataRange.getNumRows() < 1) {
      throw new Error('Sheet must have headers before setting data');
    }

    const rows = dataRange.getValues();
    const headers = rows[0]; // Get headers (don't remove)
    const keys = Utilities.headersToKeys(headers);
    const dataRows = Utilities.getArrays(objects, keys, types);

    if (dataRows.length > 0) {
      const targetRange = sheet.getRange(2, 1, dataRows.length, keys.length);
      targetRange.setValues(dataRows);
    }
  },

  /**
   * Appends row data to a sheet
   */
  appendRowsData(sheet, objects, types) {
    if (!objects || objects.length === 0) {
      return;
    }

    const dataRange = sheet.getDataRange();

    if (dataRange.getNumRows() < 1) {
      throw new Error('Sheet must have headers before appending data');
    }

    const rows = dataRange.getValues();
    const headers = rows[0]; // Get headers
    const keys = Utilities.headersToKeys(headers);
    const dataRows = Utilities.getArrays(objects, keys, types);

    if (dataRows.length > 0) {
      const startRow = Math.max(2, dataRange.getNumRows() + 1);
      const targetRange = sheet.getRange(startRow, 1, dataRows.length, keys.length);
      targetRange.setValues(dataRows);
    }
  },

  /**
   * Removes all data rows from a sheet (preserves headers)
   */
  removeRowsData(sheet, optFirstDataRowIndex) {
    const firstDataRow = optFirstDataRowIndex || 2;
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    if (lastRow >= firstDataRow && lastColumn > 0) {
      const numRows = lastRow - firstDataRow + 1;
      const range = sheet.getRange(firstDataRow, 1, numRows, lastColumn);
      range.clearContent();
    }
  },

  /**
   * Clears the entire sheet including headers
   */
  clearSheet(sheet) {
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    if (lastRow > 0 && lastColumn > 0) {
      const range = sheet.getRange(1, 1, lastRow, lastColumn);
      range.clearContent();
    }
  },

  /**
   * Sets up headers in a sheet
   */
  setHeaders(sheet, headers) {
    if (!headers || headers.length === 0) {
      return;
    }

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
  }
};

// =============================================================================
// CACHE - Caching System
// =============================================================================

/**
 * Cache class for managing sheet and type references
 */
class Cache {
  constructor(spreadsheet) {
    this.spreadsheet_ = spreadsheet;
    this.sheets_ = {};
  }

  /**
   * Creates a new Cache instance
   */
  static create(spreadsheet) {
    return new Cache(spreadsheet);
  }

  /**
   * Gets the cached spreadsheet
   */
  getSpreadsheet() {
    return this.spreadsheet_;
  }

  /**
   * Gets a cached sheet by reference
   */
  getSheet(ref) {
    const sheetRef = this.getSheetReference(ref);
    return sheetRef ? sheetRef.sheet : null;
  }

  /**
   * Gets cached types for a sheet
   */
  getTypes(ref) {
    const sheetRef = this.getSheetReference(ref);
    return sheetRef ? sheetRef.types : null;
  }

  /**
   * Gets a sheet reference from cache
   */
  getSheetReference(ref) {
    return this.sheets_[ref] || null;
  }

  /**
   * Adds a sheet reference to the cache
   */
  addSheetReference(sheet, types) {
    const sheetName = sheet.getName();
    const sheetId = sheet.getSheetId();

    const reference = {
      sheet: sheet,
      types: Utilities.parseTypes(types)
    };

    // Cache by both name and ID for flexible access
    this.sheets_[sheetName] = reference;
    this.sheets_[sheetId] = reference;
  }

  /**
   * Removes a sheet reference from cache
   */
  removeSheetReference(ref) {
    const sheetRef = this.getSheetReference(ref);

    if (sheetRef) {
      const sheet = sheetRef.sheet;
      const sheetName = sheet.getName();
      const sheetId = sheet.getSheetId();

      delete this.sheets_[sheetName];
      delete this.sheets_[sheetId];
    }
  }

  /**
   * Clears all cached references
   */
  clear() {
    this.sheets_ = {};
  }

  /**
   * Gets all cached sheet references
   */
  getAllReferences() {
    return { ...this.sheets_ };
  }
}

// =============================================================================
// TABLE - Table Class for Data Operations
// =============================================================================

/**
 * Table class for managing sheet data operations
 */
class Table {
  constructor(sheet, types) {
    this.sheet_ = sheet;
    this.types_ = types || {};
  }

  /**
   * Creates a new Table instance
   */
  static create(sheet, types) {
    return new Table(sheet, types);
  }

  /**
   * Gets the underlying sheet object
   */
  sheet() {
    return this.sheet_;
  }

  /**
   * Gets the type definitions
   */
  types() {
    return this.types_;
  }

  /**
   * Gets the column keys from the header row
   */
  keys() {
    const sheet = this.sheet_;
    const lastColumn = sheet.getLastColumn();

    if (lastColumn === 0) {
      return [];
    }

    const headerRange = sheet.getRange(1, 1, 1, lastColumn);
    const headers = headerRange.getValues()[0];

    return Utilities.headersToKeys(headers);
  }

  /**
   * Gets all data from the table
   */
  get() {
    return SheetsProcessor.getRowsData(this.sheet_, this.types_);
  }

  /**
   * Replaces all data in the table
   */
  set(data) {
    SheetsProcessor.removeRowsData(this.sheet_);

    if (data && data.length > 0) {
      SheetsProcessor.setRowsData(this.sheet_, data, this.types_);
    }

    SpreadsheetApp.flush();
  }

  /**
   * Appends data to the table
   */
  append(data) {
    if (data && data.length > 0) {
      SheetsProcessor.appendRowsData(this.sheet_, data, this.types_);
      SpreadsheetApp.flush();
    }
  }

  /**
   * Clears all data from the table (preserves headers)
   */
  clear() {
    SheetsProcessor.removeRowsData(this.sheet_);
  }

  /**
   * Gets storage used by this table
   */
  getStorageUsed() {
    return Utilities.storageUsed(this.sheet_);
  }

  /**
   * Optimizes storage for this table
   */
  optimizeStorage() {
    Utilities.storageOptimize(this.sheet_);
  }
}

// =============================================================================
// CONNECTION - Connection Class for Spreadsheet Management
// =============================================================================

/**
 * Connection class for managing spreadsheet connections
 */
class Connection {
  constructor(url, types, spreadsheet, cache) {
    this.url_ = url;
    this.types_ = types || {};
    this.spreadsheet_ = spreadsheet;
    this.cache_ = cache;
  }

  /**
   * Creates a new Connection instance
   */
  static create(source, types) {
    let spreadsheet = null;

    const sourceType = Utilities.getType(source);

    if (sourceType === 'String') {
      try {
        spreadsheet = SpreadsheetApp.openByUrl(source);
      } catch (error) {
        console.error('Failed to open spreadsheet by URL:', error);
        return null;
      }
    } else if (sourceType === 'JavaObject' && source.toString() === 'Spreadsheet') {
      spreadsheet = source;
    } else {
      console.error('Invalid source type. Expected URL string or Spreadsheet object.');
      return null;
    }

    if (!spreadsheet) {
      return null;
    }

    const cache = Cache.create(spreadsheet);
    const url = spreadsheet.getUrl();

    return new Connection(url, types, spreadsheet, cache);
  }

  /**
   * Gets the associated spreadsheet
   */
  spreadsheet() {
    return this.spreadsheet_;
  }

  /**
   * Gets a table reference for a sheet
   */
  table(ref, types) {
    let sheet = this.cache_.getSheet(ref) || Utilities.findSheet(this.spreadsheet_, ref);

    if (!sheet) {
      console.error(`Sheet not found: ${ref}`);
      return null;
    }

    const sheetId = sheet.getSheetId();

    // Add sheet reference to cache if not exists
    if (!this.cache_.getSheetReference(sheetId)) {
      const sheetTypes = this.types_[sheetId] || this.types_[sheet.getName()];
      this.cache_.addSheetReference(sheet, sheetTypes);
    }

    // Use provided types or cached types
    const finalTypes = typeof types !== 'undefined'
      ? Utilities.parseTypes(types)
      : this.cache_.getTypes(sheetId);

    return this.cache_.getSheetReference(sheetId)
      ? Table.create(this.cache_.getSheet(sheetId), finalTypes)
      : null;
  }

  /**
   * Gets the spreadsheet's timezone
   */
  timeZone() {
    return this.spreadsheet_.getSpreadsheetTimeZone();
  }

  /**
   * Gets references to all sheets in the spreadsheet
   */
  getSheetRefs() {
    return this.spreadsheet_.getSheets().map(sheet => ({
      name: sheet.getName(),
      id: sheet.getSheetId()
    }));
  }

  /**
   * Gets the storage limit for the spreadsheet
   */
  getStorageLimit() {
    return 2000000; // 2E6
  }

  /**
   * Calculates total storage used across all sheets
   */
  getStorageUsed() {
    let used = 0;
    const sheets = this.spreadsheet_.getSheets();

    for (let i = 0; i < sheets.length; i++) {
      used += Utilities.storageUsed(sheets[i]);
    }

    return used;
  }

  /**
   * Optimizes storage usage across all sheets
   */
  optimizeStorage() {
    const sheets = this.spreadsheet_.getSheets();

    for (let i = 0; i < sheets.length; i++) {
      Utilities.storageOptimize(sheets[i]);
    }
  }
}

// =============================================================================
// SHEETSDB - Public API
// =============================================================================

/**
 * Creates a connection to a spreadsheet
 * @param {string|Spreadsheet} source - Spreadsheet URL or Spreadsheet object
 * @param {Object} types - Optional type definitions for columns
 * @return {Connection|null} Connection instance or null if invalid source
 */
function connect(source, types) {
  return Connection.create(source, types);
}

/**
 * Checks if an object is a Connection instance
 * @param {*} connection - Object to check
 * @return {boolean} True if connection is a Connection instance
 */
function isConnection(connection) {
  return connection instanceof Connection;
}

/**
 * Checks if an object is a Table instance
 * @param {*} table - Object to check
 * @return {boolean} True if table is a Table instance
 */
function isTable(table) {
  return table instanceof Table;
}

// Export the public API
const SheetsDB = {
  connect,
  isConnection,
  isTable,

  // Version info
  version: '2.0.0',

  // Utility access for advanced users
  Utilities,
  Converter,
  SheetsProcessor
};

// =============================================================================
// TESTING FUNCTIONS (Optional - for verification)
// =============================================================================

/**
 * Quick test to verify SheetsDB works
 */
function testSheetsDB() {
  console.log('🚀 Testing SheetsDB...');

  try {
    // Test basic loading
    console.log('✓ SheetsDB loaded, version:', SheetsDB.version);

    // Test connection with active spreadsheet
    const db = SheetsDB.connect(SpreadsheetApp.getActiveSpreadsheet());

    if (db) {
      console.log('✓ Connection created successfully');
      console.log('✓ Timezone:', db.timeZone());
      console.log('✓ Sheets:', db.getSheetRefs().map(s => s.name));

      // Test type checking
      console.log('✓ Connection check:', SheetsDB.isConnection(db));

    } else {
      console.log('❌ Failed to create connection');
    }

    console.log('🎉 SheetsDB test completed successfully!');

  } catch (error) {
    console.error('❌ SheetsDB test failed:', error.message);
  }
}

/**
 * Demo function showing basic usage
 */
function demoSheetsDB() {
  console.log('📋 SheetsDB Demo Starting...');

  try {
    // Connect to active spreadsheet
    const db = SheetsDB.connect(SpreadsheetApp.getActiveSpreadsheet());

    if (!db) {
      throw new Error('Could not connect to spreadsheet');
    }

    // Get first sheet
    const sheets = db.getSheetRefs();
    if (sheets.length === 0) {
      throw new Error('No sheets found in spreadsheet');
    }

    const firstSheet = sheets[0];
    console.log('Using sheet:', firstSheet.name);

    // Get table
    const table = db.table(firstSheet.name);

    if (!table) {
      throw new Error('Could not create table');
    }

    // Show current data
    const currentData = table.get();
    console.log('Current data rows:', currentData.length);

    if (currentData.length > 0) {
      console.log('Sample row:', currentData[0]);
      console.log('Table keys:', table.keys());
    }

    console.log('✅ Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}
