# SheetsDB - Database Operations for Google Sheets

The code reads data from Google spreadsheet into JavaScript Objects AND writes
data from JavaScript Objects to the spreadsheet.

## Examples

**Spreadsheet with data table and attached script:**
<https://docs.google.com/spreadsheets/d/1ksyXmeb-TBAe8Ywi1VE3MrxjzzMkxP4Vfb0ZxghRI1M>

**Apps Script project with the code:**
<https://script.google.com/home/projects/1O3oDa3J8VEqasvJmVAOHLcL4shovmqF3PItdIgFC0ehIRhTZjBnQH84k>

## How to include SheetsDB into your project

To include SheetsDB as library into your Google Apps Script project use the next Script ID:

```console
1O3oDa3J8VEqasvJmVAOHLcL4shovmqF3PItdIgFC0ehIRhTZjBnQH84k
```

### Installation Steps

1. Open your Google Apps Script project
2. Click **"Libraries"** 📚 in the left sidebar
3. Add Library ID: `1O3oDa3J8VEqasvJmVAOHLcL4shovmqF3PItdIgFC0ehIRhTZjBnQH84k`
4. Select the latest version
5. Click **"Save"**

**Note:** Ensure your project uses V8 runtime (default for new projects) for optimal performance.

## Spreadsheet Requirements

- Spreadsheet should be owned or granted view (to read) or edit (to write) access
- All cells recommended to be formatted as plain text
- Sheet's first row is for column headers
- Column header may contain white spaces and should be unique
- First digit in the header will be ignored
- Columns without headers within the data table range are ignored
- Empty rows are ignored as well

### Header Transformation Examples

- `"First name"` → `"firstName"`
- `"1 title whatever"` → `"titleWhatever"`
- `"Timestamp"` → `"timestamp"`

## Data Types

Data in each column is converted to the specified data type, if the type conversion declared for the column.
Default type for reads and writes is string.

### Type Codes

- `N` - Number
- `S` - String (default)
- `O` - Object (JSON)
- `A` - Array (newline-separated)
- `D` - Date (ISO format)
- `B` - Boolean

### Example Type Declaration

```javascript
var types = {
  sheetNameOrId: {
    "Column 1": "N",
    "Column 2": "S",
    "Column 3": "O",
    "Column 4": "A",
    "Column 5": "D",
    "Column 6": "B"
  }
};
```

### Custom Type Converters

Custom type converters are allowed as function with **value** and **isWrite** arguments:

- **value** - value to convert
- **isWrite** - defines if it's write (true) or read (false) operation

```javascript
function customConverter(value, isWrite) {
    var result;
    if(isWrite) {
        result = JSON.stringify(value);
    } else {
        result = parseInt(value);
    }
    return result;
}

var types = {
  sheetNameOrId: {
    "Column 1": customConverter,
  }
};
```

## API Reference

### Main Functions

**`SheetsDB.connect(source, types)`**

- Creates connection to the spreadsheet
- `source` - Required. URL to a spreadsheet or spreadsheet object
- `types` - Optional. Type definitions object
- Returns: `Connection` instance or `null`

**`SheetsDB.isConnection(connection)`**

- Checks if connection is an instance of `Connection`
- Returns: `boolean`

**`SheetsDB.isTable(table)`**

- Checks if table is an instance of `Table`
- Returns: `boolean`

### Connection Methods

**`Connection.spreadsheet()`**

- Returns connected spreadsheet object

**`Connection.getSheetRefs()`**

- Returns array of sheet names and IDs
- Format: `[{name: "Sheet1", id: 0}, ...]`

**`Connection.timeZone()`**

- Returns the time zone for the spreadsheet

**`Connection.table(ref, types)`**

- Creates table instance for a sheet
- `ref` - Required. Sheet name or ID (*ID recommended*)
- `types` - Optional. Type overrides for this table
- Returns: `Table` instance or `null`

**`Connection.getStorageLimit()`**

- Returns cell limit for Google Spreadsheets (2,000,000)

**`Connection.getStorageUsed()`**

- Returns total cells used in connected spreadsheet

**`Connection.optimizeStorage()`**

- Removes unused cells in all sheets

### Table Methods

**`Table.get()`**

- Reads all data from table
- Returns: Array of objects

**`Table.set(data)`**

- Replaces all data in table
- `data` - Array of objects to write

**`Table.append(data)`**

- Appends data to table
- `data` - Array of objects to add

**`Table.clear()`**

- Removes all data from table (preserves headers)

**`Table.sheet()`**

- Returns connected sheet object

**`Table.types()`**

- Returns type definitions for current table

**`Table.keys()`**

- Returns column keys (camelCase headers)

**`Table.getStorageUsed()`**

- Returns cells used in this sheet

**`Table.optimizeStorage()`**

- Removes unused cells in this sheet

## Usage Examples

### Basic Usage

```javascript
// Example spreadsheet
// https://docs.google.com/spreadsheets/d/1x2OYeMHHRpNaDMgRzOhqa4m5rbQXN7lcPG1GprVtRTI/edit

// Scenario with sheet names
var types = {
  Sheet1: {
    "Column 1": "N",
    "Column 2": "S",
    "Column 3": "O",
    "Column 4": "A",
    "Column 5": "D",
    "Column 6": function(value, write) {
      // Custom converter
      return value + Number(write);
    }
  }
};

var spreadsheetURL = "https://docs.google.com/spreadsheets/d/1x2OYeMHHRpNaDMgRzOhqa4m5rbQXN7lcPG1GprVtRTI/";
var connection = SheetsDB.connect(spreadsheetURL, types);

// Get data
var data = connection.table("Sheet1").get();

// Set data
connection.table("Sheet1").set(data);

// OR cache table reference
var sheet1 = connection.table("Sheet1");
var data = sheet1.get();
sheet1.set(data);

// Append data
sheet1.append(data);
data = sheet1.get();

// Check instances
SheetsDB.isConnection(connection); // true
SheetsDB.isTable(sheet1);          // true
```

### Using Sheet IDs (Recommended)

```javascript
var types = {
  "0": {  // Sheet ID instead of name
    "Column 1": "N",
    "Column 2": "S",
    "Column 3": "O",
    "Column 4": "A",
    "Column 5": "D",
    "Column 6": function(value, write) {
      return value + Number(write);
    }
  }
};

var connection = SheetsDB.connect(spreadsheetURL, types);

// Access by ID (recommended)
var data = connection.table(0).get();

// OR still by name
var data = connection.table("Sheet1").get();

Logger.log(JSON.stringify(data));
```

### Example Output

```javascript
[
  {
    "column1": 1,
    "column2": "a",
    "column3": {
      "a": 1
    },
    "column4": [
      "1", "2", "3", "4", "5"
    ],
    "column5": "2017-01-23T12:30:28.711Z",
    "column6": "70"
  },
  {
    "column1": 2,
    "column3": {
      "a": 2
    },
    "column4": [
      "1", "2", "3", "4", "5"
    ],
    "column5": "2017-01-23T12:30:28.711Z",
    "column6": "a0"
  }
]
```

## Advanced Examples

### Working with Different Data Types

```javascript
var types = {
  "DataSheet": {
    "User ID": "N",        // Number
    "Full Name": "S",      // String
    "Birth Date": "D",     // Date
    "Is Active": "B",      // Boolean
    "Skills": "A",         // Array
    "Profile": "O"         // Object
  }
};

var db = SheetsDB.connect(SpreadsheetApp.getActiveSpreadsheet(), types);
var users = db.table("DataSheet");

// Set complex data
users.set([
  {
    userId: 1,
    fullName: "John Doe",
    birthDate: new Date("1990-05-15"),
    isActive: true,
    skills: ["JavaScript", "Python", "SQL"],
    profile: {
      department: "Engineering",
      level: "Senior",
      location: "New York"
    }
  }
]);
```

### Error Handling

```javascript
function robustDataOperation() {
  try {
    var db = SheetsDB.connect(SpreadsheetApp.getActiveSpreadsheet());

    if (!db) {
      throw new Error('Failed to connect to spreadsheet');
    }

    var table = db.table('MySheet');

    if (!table) {
      throw new Error('Sheet "MySheet" not found');
    }

    var data = table.get();
    Logger.log('Successfully retrieved ' + data.length + ' rows');

    // Process data...

  } catch (error) {
    Logger.log('Operation failed: ' + error.message);
  }
}
```

### Performance Optimization

```javascript
function optimizeSpreadsheet() {
  var db = SheetsDB.connect(SpreadsheetApp.getActiveSpreadsheet());

  Logger.log('Storage used: ' + db.getStorageUsed() + ' / ' + db.getStorageLimit());

  // Optimize all sheets
  db.optimizeStorage();

  Logger.log('Storage after optimization: ' + db.getStorageUsed());
}
```
