var Database = function() {    
    var self;
    var className;    
    
    this.initialize = function() {
        self = this;
        className = 'Database';
        
        this.openDatabase();
    };
    
    this.openDatabase = function() {
        this.db = window.openDatabase('DynaFormDatabase', '1.0', 'Dyna Form Database', 200000);
    };
    
    /*
     * converts column types of mySql to sqlite
     * i.e.
     * char -> char(xxx)
     * varchar -> varchar(xxx)
     * longblob -> blob     
     * mediumtext -> text
     * longtext -> text
     */
    this.convertColumnType = function(column) {
        var INT_TYPE = 'int';
        var TINYINT_TYPE = 'tinyint';
        var SMALLINT_TYPE = 'smallint';
        var BIGINT_TYPE = 'bigint';
        var INTEGER_TYPE = 'integer';                
        var CHAR_TYPE = 'char';
        var VARCHAR_TYPE = 'varchar';
        var BLOB_TYPE = 'blob';
        var LONGBLOB_TYPE = 'longblob';
        var TEXT_TYPE = 'text';
        var MEDIUMTEXT_TYPE = 'mediumtext';
        var LONGTEXT_TYPE = 'longtext';   
        
        var newType = '';
        switch(column.class.toLowerCase()) {
            case INT_TYPE:
            case TINYINT_TYPE:
            case SMALLINT_TYPE:
            case BIGINT_TYPE:
                newType = INTEGER_TYPE;
                break;
            case CHAR_TYPE: // char -> char(xxx)
            case VARCHAR_TYPE:
                newType = column.type;
                break;
            case LONGBLOB_TYPE:
                newType = BLOB_TYPE;
                break;
            case MEDIUMTEXT_TYPE:
            case LONGTEXT_TYPE:
                newType = TEXT_TYPE;
                break;
            default:
                newType = column.class;                    
        }
        
        return newType;
    };
    
    /*
     * converts column constraints of mySql to sqlite
     * i.e.
     * pri -> primary key
     * uni -> unique
     * auto_increment -> autoincrement     
     * on update -> default
     */
    this.convertColumnConstraint = function(column) {
        var PRIMARY_KEY_IN_MYSQL = 'pri';
        var PRIMARY_KEY_IN_SQLITE = 'primary key';        
        var UNIQUE_KEY_IN_MYSQL = 'uni';
        var UNIQUE_KEY_IN_SQLITE = 'unique';        
        var AUTOINCREMENT_EXTRA_IN_MYSQL = 'auto_increment';
        var AUTOINCREMENT_EXTRA_IN_SQLITE = 'autoincrement';        
        var DEFAULT_EXTRA_IN_MYSQL = 'on update';
        var DEFAULT_EXTRA_IN_SQLITE = 'default';        
        
        var newConstraint = '';        
        newConstraint = newConstraint + column.constraint.nullable;
        
        switch(column.constraint.key.toLowerCase()) {
            case PRIMARY_KEY_IN_MYSQL: 
                newConstraint = newConstraint + ' ' + PRIMARY_KEY_IN_SQLITE;                
                break;
            case UNIQUE_KEY_IN_MYSQL: 
                newConstraint = newConstraint + ' ' + UNIQUE_KEY_IN_SQLITE;            
                break;
            default:                
        }
        
        var newExtra = column.constraint.extra
                .replace(AUTOINCREMENT_EXTRA_IN_MYSQL, AUTOINCREMENT_EXTRA_IN_SQLITE)
                .replace(DEFAULT_EXTRA_IN_MYSQL, DEFAULT_EXTRA_IN_SQLITE);        
        newConstraint = newConstraint + ' ' + newExtra;
                
        return newConstraint;
    };
    
    // TODO: to be removed! unused function.
    /*
     * converts column names of mySql to sqlite
     * i.e.
     * name -> 'name'
     * select -> 'select'
     */
    this.convertColumnName = function(column) {
        return "'" + column.name + "'";
    };
    
    this.convertColumns = function(tableColumns) {                                
        var newColumns = [];
        $.each(tableColumns, function(index, column) {
            var newColumn = {};            
            newColumn.name = column.name;
            newColumn.type = self.convertColumnType(column);
            newColumn.constraint = self.convertColumnConstraint(column);                                                                     
            
            newColumns.push(newColumn);
        });
        
        return newColumns;
    };
    
    this.getTableList = function() {
        var functionName = 'getTableList';
        var deferred = $.Deferred();
        
        this.db.transaction(
            function(tx) {                                
                var query = "SELECT tbl_name FROM sqlite_master WHERE type = 'table' AND \n\
                    tbl_name NOT LIKE 'sqlite%' AND tbl_name NOT LIKE '%WebKit%'";                             
                tx.executeSql(query, [], 
                    function(tx, result) {                      
                        var tableNames = [];                          
                        for (index = 0; index < result.rows.length; index++) {
                            tableNames.push(result.rows.item(index).tbl_name);
                        }

                        deferred.resolve(tableNames);
                    });
            },
            function(error) {
                logHelper.error(className, functionName, error.message);                                                                       
                deferred.reject(error.message);
            }
        );

        return deferred.promise();
    };                
    
    this.createTable = function(tableName, tableColumns) {
        var functionName = 'createTable';        
        var deferred = $.Deferred();
                        
        // generate create table query through columns
        var query = "CREATE TABLE IF NOT EXISTS " + tableName + "( ";                
        $.each(tableColumns, function(index, column) {
            if (index > 0) {
                query = query + ', ';
            }
            query = query + "'" +   // prevent issues for names of statements such as select, group                        
                column.name + "' " + 
                column.type + " " +
                column.constraint;                                       
        });
        query = query + ")";                                                                        

        self.db.transaction(
            function(tx) {
                tx.executeSql(query, [],
                    function() {
                        logHelper.info(className, functionName, tableName + ' table successfully created.');                                                                       
                        deferred.resolve();
                    });
            },
            function(error) {
                logHelper.error(className, functionName, error.message); 
                deferred.reject(error.message);
            });
                                                                              
        return deferred.promise();
    };          
    
    this.modifyTable = function(tableName, structure) {
        var functionName = 'modifyTable';
        var deferred = $.Deferred();
        
        this.db.transaction(
            function(tx) {
                var query = 'ALTER TABLE ' + tableName + ' ' + structure;
                tx.executeSql(query, [],
                    function() {
                        logHelper.info(className, functionName, tableName + ' table successfully modified.');                                                
                        deferred.resolve();
                    });                    
            },
            function(error) {
                logHelper.error(className, functionName, error.message);                
                deferred.reject(error.message);
            }
        );
        
        return deferred.promise();
    };
    
    this.dropTable = function(tableName) {
        var functionName = 'dropTable';
        var deferred = $.Deferred();
        
        this.db.transaction(
            function(tx) {
                var query = 'DROP TABLE IF EXISTS ' + tableName;
                tx.executeSql(query, [],
                    function() {
                        logHelper.info(className, functionName, tableName + ' table successfully dropped.');                                                
                        deferred.resolve();
                    });                    
            },
            function(error) {
                logHelper.error(className, functionName, error.message);                
                deferred.reject(error.message);
            }
        );
        
        return deferred.promise();
    };
    
    this.hasTable = function(tableName) {
        var functionName = 'hasTable';
        var deferred = $.Deferred();
        
        this.db.transaction(
            function(tx) {
                var query = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
                tx.executeSql(query, [tableName],
                    function(tx, result) {
                        var isExistingTable;
                        if (result.rows.length === 1) {
                            isExistingTable = true;
                            logHelper.info(className, functionName, tableName + ' table exists.');                
                        } else {
                            isExistingTable = false;
                            logHelper.info(className, functionName, tableName + ' table does not exist.');
                        } 
                        
                        deferred.resolve(isExistingTable);                                                
                    });                    
            },
            function(error) {
                logHelper.error(className, functionName, error.message);                
                deferred.reject(error.message);
            }
        );

        return deferred.promise();
    };
    
    /*
        This function loads a complete info structure from the database, e.g.
        {'id': '2534','lines': [{'id': '1', 'fk_project': '2534'}]}

        s is specified like this:
        {
         "record": "SELECT * FROM project WHERE id='500A63W'",
         "lines": "SELECT * FROM project_lines WHERE fk_project='500A63W' ORDER BY id",
         "sja": "SELECT * FROM sja WHERE fk_project='500A63W' ORDER BY id",
         "time": "SELECT * FROM time WHERE fk_project='500A63W' ORDER BY id"
        };

        Because of the "asynchronyness" of the database interactions, repeat the selects one after another - just replacing the SELECT string in object s with the result set
        It can call itself whenever a select is performed and figure out if it's done by itself
    */
    this.loadStructure = function(s, cb_success, cb_error) {        
        // Check if there's any property value of type string
        var bDone = true;
        $.each(s, function(i, v) {
            if (typeof v === 'string' && bDone) {
                bDone = false;
                self.db.transaction(
                    function(tx) {
                        tx.executeSql(
                            v,
                            [],
                            function(tx, result) {
                                s[i] = [];                                
                                
                                for (var cnt = 0; cnt < result.rows.length; cnt++) {
                                    s[i][cnt] = result.rows.item(cnt);
                                }
                                self.loadStructure(s, cb_success, cb_error);
                            }
                        );
                    },
                    function(error) {
                        s[i] = null;
                        cb_error();
                    }
                );
            }
        });
        
        // Only if all database interactions were carried out (bDone is still false)
        if (bDone) {                   
            // Move all children of 'record' to the highest level (actually, of record[0])                    
            if(s.record !== undefined) {                
                if (s.record.length > 0) {
                    $.each(s.record[0], function(i, v) {
                        if (typeof s[i] === 'undefined') {
                            s[i] = v;
                        }
                    });
                }
            }                
        
            delete s.record;
            cb_success(s);
        }
    };
        
    this.deleteArchived = function() {
        var functionName = 'deleteArchived';
        
        self.db.transaction(
            function(tx) {
                var query = 'SELECT value FROM ' + app.tableNames.settings + 
                    ' WHERE key = "delete.after.days"';                  
                tx.executeSql(query, [],
                    function(tx, result) {                                
                        if (result.rows !== undefined && result.rows.length > 0) {
                            var deleteAfterDays = result.rows.item(0).value; 
                            database.getTableList()
                                .done(
                                    function(tableNames) {                    
                                        if (tableNames.length === 0) {
                                            logHelper.info(className, functionName, 'There is no table.');                        
                                        } else {                                                                                                                   
                                            $.each(tableNames, function(index, tableName) {
                                                if (tableName === app.tableNames.user || tableName === app.tableNames.settings) {                                                    
                                                } else {
                                                    self.db.transaction(
                                                        function(tx) {
                                                            query = 'DELETE FROM ' + tableName + 
                                                                ' WHERE updated <= ?';
                                                            var archiveDate = dateHelper.addDays(new Date(), -deleteAfterDays);
                                                            tx.executeSql(query, [archiveDate],
                                                                function() {
                                                                    logHelper.info(className, functionName, 'Successfully deleted ' + deleteAfterDays + ' old days records from ' + tableName + '.');                                                                                            
                                                                });                    
                                                        },
                                                        function(error) {
                                                            logHelper.error(className, functionName, error.message);                                                    
                                                        }
                                                    );       
                                                }
                                            });
                                        }
                                    }                
                                );
                        }                             
                    });                    
            },
            function(error) {
                logHelper.error(className, functionName, error.message);                                                    
            }
        );                                
    };
    
    this.initialize();
};
