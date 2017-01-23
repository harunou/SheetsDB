(function () {

    var DB = function (url, types) {
        if (!(this instanceof DB)) return DB.connect(url, types)

        this.url_ = url;
        this.types_ = types || {};
        this.activeSheetId_ = null;
    }
    DB.connect = function (url, types) {
        var cache = Cache.create(url)

        DB.prototype.spreadsheet = function () {
            return cache.getSpreadsheet()
        }
        DB.prototype.table = function (ref, types) {
            var sheet = cache.getSheet(ref) || util.findSheet(this.spreadsheet(), ref);
            if (sheet) {
                this.activeSheetId_ = sheet.getSheetId()
                types = types || this.types_[this.activeSheetId_] || this.types_[sheet.getName()]
                cache.getSheetReference(this.activeSheetId_) || cache.addSheetReference(sheet, types)
            }
            return cache.getSheetReference(this.activeSheetId_) 
                   && Table.create(cache.getSheet(this.activeSheetId_), cache.getTypes(this.activeSheetId_))
        }

        return new DB(url, types)
    }
    DB.getSheetIds = function (url) {
        var spreadsheet = SpreadsheetApp.openByUrl(url)
        return spreadsheet.getSheets().map(function (sheet) {
            return {
                'name': sheet.getName(),
                'id': sheet.getSheetId()
            }
        })
    }
    DB.prototype = {
        'timeZone': function () {
            return this.spreadsheet().getSpreadsheetTimeZone()
        }
    }

    var Table = DB.Table = function (sheet, types) {
        this.sheet_ = sheet;
        this.types_ = util.parseTypes(types);
    }
    Table.create = function (sheet, types) {
        return new Table(sheet, types)
    }
    Table.prototype = {
        'sheet': function () {
            return this.sheet_.sheet
        },
        'get': function () {
            return sheetsProcessor.getRowsData(this.sheet_, this.types_)
        },
        'set': function (data) {
            sheetsProcessor.setRowsData(this.sheet_, data, this.types_)
        },
        'append': function (data) {
            sheetsProcessor.appendRowsData(this.sheet_, data, this.types_)
        },
        'clear': function () {
            sheetsProcessor.removeRowsData(this.sheet_)
        }
    }

    var Cache = function (url) {
        if (!(this instanceof Cache)) return Cache.create(url);
        this.spreadsheet_ = SpreadsheetApp.openByUrl(url)
        this.sheets_ = {}
    }
    Cache.create = function (url) {
        return new Cache(url)
    }
    Cache.prototype = {
        'getSpreadsheet': function () {
            return this.spreadsheet_
        },
        'getSheet': function (ref) {
            return this.getSheetReference(ref) && this.getSheetReference(ref).sheet
        },
        'getTypes': function (ref) {
            return this.getSheetReference(ref) && this.getSheetReference(ref).types
        },
        'getSheetReference': function (ref) {
            return this.sheets_[ref] || null
        },
        'addSheetReference': function (sheet, types) {
            this.sheets_[sheet.getName()] =
                this.sheets_[sheet.getSheetId()] = {
                    'sheet': sheet,
                    'types': (types || {})
                };
        }
    };

    var sheetsProcessor = {
        'getRowsData': function (sheet, types) {
            var dataRange = sheet.getDataRange(),
                rows = dataRange.getValues(),
                headers = rows.shift();
            return util.getObjects(rows, util.headersToKeys(headers), types)
        },
        'setRowsData': function (sheet, objects, types) {
            var dataRange = sheet.getDataRange(),
                keys = util.headersToKeys(dataRange.getValues().shift()),
                rows = util.getArrays(objects, keys, types);
            this.removeRowsData(sheet)
            sheet.getRange(2, 1, rows.length, keys.length).setValues(rows)
        },
        'appendRowsData': function (sheet, objects, types) {
            var dataRange = sheet.getDataRange(),
                rows = dataRange.getValues(),
                keys = util.headersToKeys(rows.shift()),
                append = util.getArrays(objects, keys, types)
            sheet.getRange(2 + rows.length, 1, append.length, keys.length).setValues(append)
        },
        'removeRowsData': function (sheet, optFirstDataRowIndex) {
            var r = optFirstDataRowIndex || 2
            var c = 1
            var rs = (sheet.getLastRow() - r + 1) || 1
            var cs = (sheet.getLastColumn() - c + 1) || 1
            sheet.getRange(r, c, rs, cs).clearContent()
        }
    }

    var converter = {
        'separator': '\n',
        'N': function (v, write) {
            return write ? v.toString() : parseInt(v)
        },
        'S': function (v, write) {
            return v
        },
        'A': function (v, write) {
            return write ?
                   (v.join(converter.separator)) :
                   (v === '' ? [] : v.split(converter.separator))
        },
        'O': function (v, write) {
            return write ?
                   (JSON.stringify(v)) :
                   (v === '' ? {} : JSON.parse(v))

        },
        'D': function (v, write) {
            return write ?
                   (v.toISOString ? v.toISOString() : v) :
                   (v === '' ? '' : new Date(v))
        },
        'noop': function (v, write) {
            return v
        }
    }

    var util = {
        'toType': function (o) {
            return {}.toString.call(o).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
        },
        'getSheetById': function (spreadsheet, id) {
            var sheets = spreadsheet.getSheets()
            for (var i = 0, len = sheets.length; i < len; i++) {
                if (sheets[i].getSheetId() === id) {
                    return sheets[i]
                }
            }
            return null
        },
        'getSheetByName': function (spreadsheet, name) {
            return spreadsheet.getSheetByName(name)
        },
        'findSheet': function (spreadsheet, ref) {
            var refType = util.toType(ref);
            return refType == 'number' ? util.getSheetById(spreadsheet, ref) :
                   refType == 'string' ? util.getSheetByName(spreadsheet, ref) :
                   null;
        },
        'getArrays': function (objects, keys, types) {
            var arrays = []
            for (var i = 0, len = objects.length; i < len; i++) {
                arrays.push(util.getArray(objects[i], keys, types))
            }
            return arrays
        },
        'getArray': function (object, keys, types) {
            var array = keys.slice(),
                key, value, conv;
            for (var i = 0, len = keys.length; i < len; i++) {
                key = keys[i];
                value = object[key];
                conv = util.toType(types[key]) == 'function' ? types[key] :
                       util.toType(converter[types[key]]) == 'function' ? converter[types[key]] :
                       converter.noop;
                array[i] = typeof value == 'undefined' ? '' : conv.call(null, value, true);
            }
            return array
        },
        'getObjects': function (arrays, keys, types) {
            var objects = [],
                o, hasData, key, value, conv;
            for (var i = 0, iLen = arrays.length; i < iLen; i++) {
                o = {};
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
                    o[keys[j]] = value;
                    hasData = true;
                }
                if (hasData) objects.push(o);
            }
            return objects;
        },
        'headersToKeys': function (headers) {
            var keys = [],
                k;
            for (var i = 0, len = headers.length; i < len; i++) {
                k = util.headerToKey(headers[i]);
                if (~keys.indexOf(k) || k === "") keys.push(null);
                else keys.push(k);
            }
            return keys;
        },
        'headerToKey': function (header) {
            return header.replace(/\s+(\w)/g, util.regexToUpperCase).replace(/^\d+(\w)/, util.regexToLowerCase)
        },
        'regexToLowerCase': function (match, transform) {
            return transform.toLowerCase()
        },
        'regexToUpperCase': function (match, transform) {
            return transform.toUpperCase()
        },
        'parseTypes': function (types) {
            var result = {}
            for (var header in types) {
                result[util.headerToKey(header)] = types[header]
            }
            return result
        }
    }

    return DB

})()