var SheetsDB = (function () {

    function connect(url, types) {
        var cache = Cache.create(SpreadsheetApp.openByUrl(url));

        Connection.prototype.spreadsheet = function () {
            return cache.getSpreadsheet();
        }
        Connection.prototype.table = function (ref, types) {
            var sheetId,
                sheet = cache.getSheet(ref) || util.findSheet(this.spreadsheet(), ref);
            if (sheet) {
                sheetId = sheet.getSheetId();
                cache.getSheetReference(sheetId) 
                || cache.addSheetReference(sheet, this.types_[sheetId] || this.types_[sheet.getName()]);
                types = typeof types == 'undefined' ? cache.getTypes(sheetId) : util.parseTypes(types);	
            }
            return cache.getSheetReference(sheetId) 
                   && Table.create(cache.getSheet(sheetId), types);
        }
        return new Connection(url, types);
    }


    function Connection(url, types) {
        if (!(this instanceof Connection)) return connect(url, types);
        this.url_ = url;
        this.types_ = types || {};
    }
    Connection.prototype.timeZone = function () {
        return this.spreadsheet().getSpreadsheetTimeZone();
    }
    Connection.prototype.getSheetRefs = function () {
        return this.spreadsheet().getSheets().map(function (sheet) {
            return {
                'name': sheet.getName(),
                'id': sheet.getSheetId()
            };
        });
    };


    var Table = function (sheet, types) {
        this.sheet_ = sheet;
        this.types_ = types;
    }
    Table.create = function (sheet, types) {
        return new Table(sheet, types);
    }
    Table.prototype.sheet = function () {
        return this.sheet_;
    }
    Table.prototype.types = function () {
        return this.types_;
    }
    Table.prototype.keys = function () {
        var dataRange = this.sheet().getDataRange(),
            rows = dataRange.getValues(),
            headers = rows.shift();
        return util.headersToKeys(headers);
    }
    Table.prototype.get = function () {
        return sheetsProcessor.getRowsData(this.sheet_, this.types_);
    }
    Table.prototype.set = function (data) {
        sheetsProcessor.setRowsData(this.sheet_, data, this.types_);
    }
    Table.prototype.append = function (data) {
        sheetsProcessor.appendRowsData(this.sheet_, data, this.types_);
    }
    Table.prototype.clear = function () {
        sheetsProcessor.removeRowsData(this.sheet_);
    }


    var Cache = function (spreadsheet) {
        this.spreadsheet_ = spreadsheet;
        this.sheets_ = {};
    }
    Cache.create = function (spreadsheet) {
        return new Cache(spreadsheet);
    }
    Cache.prototype.getSpreadsheet = function () {
        return this.spreadsheet_;
    }
    Cache.prototype.getSheet = function (ref) {
        return this.getSheetReference(ref) && this.getSheetReference(ref).sheet;
    }
    Cache.prototype.getTypes = function (ref) {
        return this.getSheetReference(ref) && this.getSheetReference(ref).types;
    }
    Cache.prototype.getSheetReference = function (ref) {
        return this.sheets_[ref] || null;
    }
    Cache.prototype.addSheetReference = function (sheet, types) {
        this.sheets_[sheet.getName()] =
            this.sheets_[sheet.getSheetId()] = {
                'sheet': sheet,
                'types': util.parseTypes(types)
            };
    };


    var sheetsProcessor = {
        'getRowsData': function (sheet, types) {
            var dataRange = sheet.getDataRange(),
                rows = dataRange.getValues(),
                headers = rows.shift();
            return util.getObjects(rows, util.headersToKeys(headers), types);
        },
        'setRowsData': function (sheet, objects, types) {
            var dataRange = sheet.getDataRange(),
                rows = dataRange.getValues(),
                keys = util.headersToKeys(rows.shift()),
                set = util.getArrays(objects, keys, types);
            this.removeRowsData(sheet);
            sheet.getRange(2, 1, set.length, keys.length).setValues(set);
        },
        'appendRowsData': function (sheet, objects, types) {
            var dataRange = sheet.getDataRange(),
                rows = dataRange.getValues(),
                keys = util.headersToKeys(rows.shift()),
                append = util.getArrays(objects, keys, types);
            sheet.getRange(2 + rows.length, 1, append.length, keys.length).setValues(append);
        },
        'removeRowsData': function (sheet, optFirstDataRowIndex) {
            var r = optFirstDataRowIndex || 2,
                c = 1,
                rs = (sheet.getLastRow() - r + 1) || 1,
                cs = (sheet.getLastColumn() - c + 1) || 1;
            sheet.getRange(r, c, rs, cs).clearContent()
        }
    }


    var converter = {
        'separator': '\n',
        'N': function (v, write) {
            return write ? v.toString() : v * 1;
        },
        'S': function (v, write) {
            return v;
        },
        'A': function (v, write) {
            return write ? 
                   (v.join(converter.separator)) :
                   (v === '' ? [] : v.split(converter.separator));
        },
        'O': function (v, write) {
            return write ?
                   (JSON.stringify(v)) :
                   (v === '' ? {} : JSON.parse(v));

        },
        'D': function (v, write) {
            return write ?
                   (v.toISOString ? v.toISOString() : v) :
                   (v === '' ? '' : new Date(v));
        },
        'noop': function (v, write) {
            return v;
        }
    }


    var util = {
        'toType': function (o) {
            return {}.toString.call(o).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
        },
        'getSheetById': function (spreadsheet, id) {
            var sheets = spreadsheet.getSheets();
            for (var i = 0, len = sheets.length; i < len; i++) {
                if (sheets[i].getSheetId() === id) {
                    return sheets[i];
                };
            };
            return null;
        },
        'getSheetByName': function (spreadsheet, name) {
            return spreadsheet.getSheetByName(name);
        },
        'findSheet': function (spreadsheet, ref) {
            var refType = util.toType(ref);
            return refType == 'number' ? util.getSheetById(spreadsheet, ref) :
                   refType == 'string' ? util.getSheetByName(spreadsheet, ref) :
                   null;
        },
        'getArrays': function (objects, keys, types) {
            var arrays = new Array(objects.length);
            for (var i = 0, len = objects.length; i < len; i++) {
                arrays[i] = util.getArray(objects[i], keys, types);
            }
            return arrays;
        },
        'getArray': function (object, keys, types) {
            var array = new Array(keys.length),
                key, value, conv;
            for (var i = 0, len = keys.length; i < len; i++) {
                key = keys[i];
                value = object[key];
                conv = util.toType(types[key]) == 'function' ? types[key] :
                       util.toType(converter[types[key]]) == 'function' ? converter[types[key]] :
                       converter.noop;
                array[i] = typeof value == 'undefined' ? null : conv.call(null, value, true);
            }
            return array;
        },
        'getObjects': function (arrays, keys, types) {
            var objects = [],
                object, key, value, conv, hasData;
            for (var i = 0, iLen = arrays.length; i < iLen; i++) {
                object = {};
                hasData = false;
                for (var j = 0, jlen = arrays[i].length; j < jlen; j++) {
                    key = keys[j]
                    value = arrays[i][j];
                    conv = util.toType(types[key]) == 'function' ? types[key] :
                           util.toType(converter[types[key]]) == 'function' ? converter[types[key]] :
                           converter.noop;
                    if (key === null) continue;
                    value = conv.call(null, value, false);
                    if (value === '') continue;
                    object[keys[j]] = value;
                    hasData = true;
                }
                hasData && objects.push(object);
            }
            return objects;
        },
        'headersToKeys': function (headers) {
            var keys = new Array(headers.length),
                key;
            for (var i = 0, len = headers.length; i < len; i++) {
                key = util.headerToKey(headers[i]);
                keys[i] = ~keys.indexOf(key) || key === '' ? null : key;
            }
            return keys;
        },
        'headerToKey': function (header) {
            return header.replace(/\s+(\w)/g, util.regexToUpperCase)
                         .replace(/^\d+(\w)/, util.regexToLowerCase)
                         .replace(/^(\w)/   , util.regexToLowerCase);
        },
        'regexToLowerCase': function (match, transform) {
            return transform.toLowerCase();
        },
        'regexToUpperCase': function (match, transform) {
            return transform.toUpperCase();
        },
        'parseTypes': function (types) {
            var result = {};
            for (var header in types) {
                result[util.headerToKey(header)] = types[header];
            }
            return result;
        }
    }

    return {
        'Connection': Connection,
        'Table': Table,
        'connect': function (url, types) {
            return connect(url, types)
        }
    };
    
})()
