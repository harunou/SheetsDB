Based on the _Reading Data from a Spreadsheet into JavaScript Objects_ AND _Writing Data from JavaScript Objects to a Spreadsheet_ tutorials.

https://web.archive.org/web/20130118042137/https://developers.google.com/apps-script/storing_data_spreadsheets#advanced

###Apps scrtipt project with the code
https://script.google.com/d/1eAGteVN9UsYwqMbFTaUufhxMTMix8LPbcb1R2OdspaCbiuCT-XPLK5uj/edit?usp=sharing

###Spreadsheet
Should be owned or granted view or edit access.

###Sheet
First row is for column titles.

###Columns and rows
Column header (title) may contain white spaces and should be unique. First digit in the header will be ignored.
For example, 'First name' header transforms to 'firstName' key, '1 title whatever' -> 'titleWhatever', 'Timestamp' -> 'timestamp'. 
Columns with no headers in the data range will be ignored. Empty rows will be ignored as well.

###Column types
Column data will be converted to the specified data type, if the type conversion exists for the column.
Default type is a string.

Default types:
- N - number,
- S - string,
- O - object,
- A - array,
- D - date.

Custom type converters are allowed as function with __value__ and __write__ arguments. __value__ - value to convert, __write__ - defines, if it's write(true) or read(false) operation.

###Cells
All cells recommended to be formatted as plain text.

###API
_SheetsDB.connect( url, types )_ - creates __Connection__ to the spreadsheet, __url__ is required, __types__ is optional.

_Connection.spreadsheet()_ - returns connected spreadsheet.

_Connection.getSheetRefs()_ - returns an array of the sheet names and ids of the connected spreadsheet.

_Connection.timeZone()_ - returns the time zone for the spreadsheet.

_Connection.table( ref, types )_ - returns __Table__, __ref__ is required and should be the name or the ID of a sheet, __types__ are optional, but if defined, table instance will use it to convert the data, __types__ defined in this method, do not overwrite global types definition and affects only created Table instance.

_Table.get()_ - reads all data from the table and returns array of objects.

_Table.set( data )_ - writes the data to the table.

_Table.append( data )_ - appends the data to the table.

_Table.clear()_ - removes all the data from the table.

_Table.sheet()_ - returns connected sheet.

_Table.types()_ - returns types object defined for the current table instance.

_Table.keys()_ - return keys of the table.



Use of the sheet ID instead of the name to refer is recommended.

###Usage
```
  //Test spreadsheet https://docs.google.com/spreadsheets/d/1x2OYeMHHRpNaDMgRzOhqa4m5rbQXN7lcPG1GprVtRTI/
  //Scenario with the sheet name
	
  var types = {
    'Sheet1': {
      'Column 1': 'N',
      'Column 2': 'S',
      'Column 3': 'O',
      'Column 4': 'A',
      'Column 5': 'D',
      'Column 6': function( value, write ){ //custom converter
        return value + Number(write)
      }
    }
  }

  var spreadsheetURL = 'https://docs.google.com/spreadsheets/d/1x2OYeMHHRpNaDMgRzOhqa4m5rbQXN7lcPG1GprVtRTI/'
  var connection = SheetsDB.connect( spreadsheetURL, types )
  var data = connection.table( 'Sheet1' ).get()
  connection.table( 'Sheet1' ).set( data )
  
  //  OR
  
  var sheet1 = connection.table( 'Sheet1' )
  var data = sheet1.get()
  sheet1.set( data )
  
  // AND
  
  sheet1.append( data )
  data = sheet1.get()
  
  
  //Check instances
  
  connection instanceof SheetsDB.Connection //true
  connection.constructor == SheetsDB.Connection //true	
  
  sheet1 instanceof SheetsDB.Table //true
  sheet1.constructor == SheetsDB.Table //true	

  
  
  //Scenario with the sheet ID
  
  var types = {
    '0': {
      'Column 1': 'N',
      'Column 2': 'S',
      'Column 3': 'O',
      'Column 4': 'A',
      'Column 5': 'D',
      'Column 6': function( value, write ){
        return value + Number(write)
      }
    }
  }
  

  var connection = SheetsDB.connect( spreadsheetURL, types )
  var data = connection.table( 0 ).get()
  
  //OR
  
  var data = connection.table( 'Sheet1' ).get()
  Logger.log( JSON.stringify( data ) )
  
  
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









