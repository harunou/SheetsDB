The code reads data from Google spreadsheet into JavaScript Objects AND writes data from JavaScript Objects to the spreadsheet.

### Examples.
Spreadsheet with data table and attached script
https://docs.google.com/spreadsheets/d/1x2OYeMHHRpNaDMgRzOhqa4m5rbQXN7lcPG1GprVtRTI/edit

Apps scrtipt project with the code
https://script.google.com/d/1eAGteVN9UsYwqMbFTaUufhxMTMix8LPbcb1R2OdspaCbiuCT-XPLK5uj/edit

### How to include SheetsDB into your project.
To include SheetsDB as library into your Google apps script project use the next Script Id
```
1gsvjRca2mBA3yjy9fbWeenKVyAK6gEwj-AkBIyFyZZTbqC2BB9e_WwS-
```

### Spreadsheet requirements.
Spreadsheet with should be owned or granted view (to read) or edit (to write) access.

All cells recommended to be formatted as plain text.

Sheet's first row is for column headers. Column header may contain white spaces and should be unique. First digit in the header will be ignored.
For example, `"First name"` header transforms to `"firstName"` key, `"1 title whatever"` → `"titleWhatever"`, `"Timestamp"` → `"timestamp"`.
Columns without headers within the data table range are ignored. Empty rows are ignored as well.

### Data types.
Data in each column is converted to the specified data type, if the type conversion declared for the column.
Default type for reads and writes is string.

Codes used in the type declaration:
* `N` - number,
* `S` - string,
* `O` - object,
* `A` - array,
* `D` - date.

Example type declaraion:
```javascript
var types = {
  sheetNameOrId: {
    "Column 1": "N",
    "Column 2": "S",
    "Column 3": "O",
    "Column 4": "A",
    "Column 5": "D"
  }
};
```
Custom type converters are allowed as function with __value__ and __isWrite__ arguments. __value__ - value to convert, __isWrite__ - defines, if it's write (true) or read (false) operation.
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

### API
`SheetsDB.connect(source, types)` - creates connection to the spreadsheet, `source` is required and can be an URL to a spreadsheet or a spreadsheet, `types` is optional.

`SheetsDB.isConnection(connection)` - checks if connection is an instansce of `Connection`.

`SheetsDB.isTable(table)` - checks if table is an instance of `Table`.

`Connection.spreadsheet()` - returns connected spreadsheet.

`Connection.getSheetRefs()` - returns an array of the sheet names and ids of the connected spreadsheet.

`Connection.timeZone()` - returns the time zone for the spreadsheet.

`Connection.table(ref, types)` - returns instance of `Table`, `ref` is required and should be the name or the ID of a sheet, `types` are optional, but if defined, table instance will use it to convert the data, `types` defined in this method, do not overwrite global types definition and affects only created Table instance.

Use of the sheet id instead of the name to refer is recommended.

`Connection.getStorageLimit()` - returns amount of cells allowed in the Google spreadsheet app.

`Connection.getStorageUsed()` - returns amount of cells used in the connected spreadsheet.

`Connection.optimizeStorage()` - removes unused (empty) cells in all sheets in the connected spreadsheet.

`Table.get()` - reads all data from the table and returns array of objects.

`Table.set(data)` - writes the data to the table.

`Table.append(data)` - appends the data to the table.

`Table.clear()` - removes all the data from the table.

`Table.sheet()` - returns connected sheet.

`Table.types()` - returns types object defined for the current table instance.

`Table.keys()` - return keys of the table.

`Table.getStorageUsed()` - returns amount of cells used in the sheet.

`Table.optimizeStorage()`- removes unused (empty) cells in the sheet.

### Usage
```javascript
//Example spreadsheet https://docs.google.com/spreadsheets/d/1x2OYeMHHRpNaDMgRzOhqa4m5rbQXN7lcPG1GprVtRTI/edit

//Scenario with sheet names

var types = {
  Sheet1: {
    "Column 1": "N",
    "Column 2": "S",
    "Column 3": "O",
    "Column 4": "A",
    "Column 5": "D",
    "Column 6": function(value, write) {
      //custom converter
      return value + Number(write);
    }
  }
};

var spreadsheetURL = "https://docs.google.com/spreadsheets/d/1x2OYeMHHRpNaDMgRzOhqa4m5rbQXN7lcPG1GprVtRTI/";
var connection = SheetsDB.connect(spreadsheetURL, types);
var data = connection.table("Sheet1").get();
connection.table("Sheet1").set(data);

//  OR

var sheet1 = connection.table("Sheet1");
var data = sheet1.get();
sheet1.set(data);

// AND

sheet1.append(data);
data = sheet1.get();

//Check instances

SheetsDB.isConnection(connection); //true
SheetsDB.isTable(sheet1); //true

//Scenario with sheet IDs

var types = {
  "0": {
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
var data = connection.table(0).get();

//OR

var data = connection.table("Sheet1").get();
Logger.log(JSON.stringify(data));

//Log
/*
 [
  {
    "column1": 1,
    "column2": "a",
    "column3": {
      "a": 1
    },
    "column4": [
      "1",
      "2",
      "3",
      "4",
      "5"
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
      "1",
      "2",
      "3",
      "4",
      "5"
    ],
    "column5": "2017-01-23T12:30:28.711Z",
    "column6": "a0"
  }
 ]
*/
```
