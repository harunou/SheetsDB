###SheetsDB allows read and write data from spreadsheet as JavaScript objects.
Based on Reading Data from a Spreadsheet into JavaScript Objects/Writing Data from JavaScript Objects to a Spreadsheet
https://web.archive.org/web/20130118042137/https://developers.google.com/apps-script/storing_data_spreadsheets#writing

##Spreadsheet.
Should be owned or granted edit access.

##Sheet.
First row is for column titles.

##Columns and rows.
Column title may contain white spaces and should be unique. First digit will be ignored.
For example, 'First name' title will be outputted as 'firstName', '1 order whatever' -> 'orderWhatever'. 
Columns with no titles in data range will be ignored. Empty rows will be ignored as well.

##Column types.
- N - number,
- S - string,
- O - object,
- A - array,
- D - date.

Column data will be converted to a number or an object or other type, if type conversion is specified for the column.
Default type is a string. 
Custom type converters are allowed as function with __value__ and __write__ arguments.
__value__ - value to convert,
__write__ - defines if it's write(true) or read(false) operation.

##Cells: 
All cells should be formatted as plain text.

##API:
SheetsDB.connect( url, types ) - creates __Connection__ to the spreadsheet

SheetsDB.getSheetIds( url ) - returns array of sheet names and sheets ids of specified spreadsheet

Connection.spreadsheet() - returns connected spreadsheet

Connection.table( ref, types ) - returns __Table__, __ref__ is the name or the ID of the sheet, types are optional here

Connection.timeZone() - returns the time zone for the spreadsheet

Table.get() - reads all data from the table

Table.set() - writes data to the table

Table.append() - appends data to the table

Table.clear() - removes all data from the table

Table.sheet() - returns connected sheet



Use of the sheet ID instead of the name to refer is recommended.

##Usage:
```
  //Scenario with the sheet names
	
  var types = {
    'Sheet1': {
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

  var spreadsheetURL = 'https://docs.google.com/spreadsheets/d/1x2OYeMHHRpNaDMgRzOhqa4m5rbQXN7lcPG1GprVtRTI/'
  var connection = SheetsDB.connect( spreadsheetURL, types )
  
  var data = connection.table( 'Sheet1' ).get()
  Logger.log( data )
  connection.table( 'Sheet1' ).set( data )
  
  //  OR
  
  var sheet1 = connection.table( 'Sheet1' )
  var data = sheet1.get()
  Logger.log( data )
  sheet1.set( data )
  
  // AND
  
  sheet1.append( data )
  data = sheet1.get()
  Logger.log( data )
  
  
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
  
  var spreadsheetURL = 'https://docs.google.com/spreadsheets/d/1x2OYeMHHRpNaDMgRzOhqa4m5rbQXN7lcPG1GprVtRTI/'
  var connection = SheetsDB.connect( spreadsheetURL, types )
  
  var data = connection.table( 0 ).get()
  Logger.log( data )
  
  
  //Log
  /*
  [
  {
    Column6=70,
    Column2=a,
    Column3={
      a=1
    },
    Column4=[
      1,
      2,
      3,
      4,
      5
    ],
    Column5=MonJan2308: 30: 28GMT-04: 002017,
    Column1=1.0
  },
  {
    Column6=a0,
    Column2=a,
    Column3={
      a=2
    },
    Column4=[
      1,
      2,
      3,
      4,
      5
    ],
    Column5=MonJan2308: 30: 28GMT-04: 002017,
    Column1=2.0
  }
  ]
  */
```









