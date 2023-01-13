var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/*
 * Created on Fri Dec 16 2022
 * Copyright (c) 2022 Connor Doman
 */
import * as mysql from "mysql2/promise";
export const MINUTE_S = 60; // 60s
export const HOUR_S = MINUTE_S * 60; // 3600s
export const HALF_HOUR_S = HOUR_S / 2; // 1800s
export const DAY_S = HOUR_S * 24; // 86400s
export const WEEK_S = DAY_S * 7; // 604800s
export const MONTH_S = DAY_S * 30; // 2592000s
export const YEAR_S = DAY_S * 365; // 946080000s
export const DB_CONFIG = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "-00:00",
};
export class Database {
    constructor(options) {
        this.connection = undefined;
        if (options) {
            this.host = options.host;
            this.user = options.user;
            this.password = options.password;
            this.database = options.database;
            this.waitForConnections = options.waitForConnections;
            this.connectionLimit = options.connectionLimit;
            this.queueLimit = options.queueLimit;
            this.timezone = options.timezone;
        }
        else {
            this.host = DB_CONFIG.host;
            this.user = DB_CONFIG.user;
            this.password = DB_CONFIG.password;
            this.database = DB_CONFIG.database;
            this.waitForConnections = DB_CONFIG.waitForConnections;
            this.connectionLimit = DB_CONFIG.connectionLimit;
            this.queueLimit = DB_CONFIG.queueLimit;
            this.timezone = DB_CONFIG.timezone;
        }
        this.pool = mysql.createPool(this.getDBConfig());
        // if (this.pool)
        //     console.log(`Connected to MySQL database with config: '${JSON.stringify(this.getDBConfig(), null, 4)}'`);
    }
    getDBConfig() {
        return {
            host: this.host,
            user: this.user,
            password: this.password,
            database: this.database,
            waitForConnections: this.waitForConnections,
            connectionLimit: this.connectionLimit,
            queueLimit: this.queueLimit,
            timezone: this.timezone,
        };
    }
    getConnection(pool) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let conn;
                if (!this.connection) {
                    if (pool) {
                        conn = yield this.createConnection(pool);
                    }
                    else {
                        conn = yield this.createConnection();
                    }
                    return conn;
                }
            }
            catch (err) {
                console.error(`Error in database.getConnection: ${err}`);
                return undefined;
            }
            return this.connection;
        });
    }
    createConnection(pool) {
        return __awaiter(this, void 0, void 0, function* () {
            if (pool) {
                this.connection = yield pool.getConnection();
            }
            this.connection = yield this.pool.getConnection();
            return this.connection;
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.connection) {
                yield this.connection.end();
                this.connection = undefined;
            }
            yield this.pool.end();
        });
    }
    query(query, values) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let conn = yield this.getConnection();
                if (conn) {
                    query = query.trim();
                    if (query[query.length - 1] !== ";")
                        query += ";";
                    let [rows] = yield conn.query(query, values);
                    return rows;
                }
            }
            catch (err) {
                console.error(`Error in database.query: ${err}`);
                return [];
            }
            return [];
        });
    }
    startTransaction(pool) {
        return __awaiter(this, void 0, void 0, function* () {
            let conn = yield this.getConnection(pool);
            if (conn) {
                yield conn.beginTransaction();
                return true;
            }
            return false;
        });
    }
    commitTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            let conn = yield this.getConnection();
            if (conn) {
                yield conn.commit();
                yield conn.end();
                this.connection = undefined;
                return true;
            }
            return false;
        });
    }
}
export class MessageDatabase extends Database {
    constructor(options) {
        super(options ? options : Object.assign(Object.assign({}, DB_CONFIG), { database: "contact" }));
    }
    insertMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = "INSERT INTO message (firstName, lastName, email, messageSubject, messageText, submitTime, ipAddress) VALUES (?, ?, ?, ?, ?, CONVERT_TZ(NOW(),'SYSTEM','America/Vancouver'), ?);";
            let values = [
                message.firstName,
                message.lastName,
                message.email,
                message.messageSubject,
                message.messageText,
                message.ipAddress,
            ];
            let result = yield this.query(query, values);
            return result && result.affectedRows > 0;
        });
    }
    deleteMessage(email, ipAddress, submitTime) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let query = "DELETE FROM message WHERE email = ? AND ipAddress = ? AND submitTime = ?;";
                let values = [email, ipAddress, submitTime];
                let result = yield this.query(query, values);
                if (result) {
                    return result.affectedRows === 1;
                }
            }
            catch (err) {
                console.error("Error in MessageDatabase.deleteMessage: " + err.message);
            }
            return false;
        });
    }
    getTimeSinceEmailLastSent(email) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = "SELECT NOW() - submitTime AS timeSince FROM message WHERE email = ? ORDER BY submitTime DESC LIMIT 1";
            let values = [email];
            let [rows] = yield this.query(query, values);
            if (rows) {
                return rows.timeSince;
            }
            console.log(`No messages found for email: ${email}`);
            return HALF_HOUR_S;
        });
    }
    getTimeSinceIPLastSent(ipAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = "SELECT NOW() - submitTime AS timeSince FROM message WHERE ipAddress = ? ORDER BY submitTime DESC LIMIT 1";
            let values = [ipAddress];
            let [rows] = yield this.query(query, values);
            if (rows) {
                return rows.timeSince;
            }
            console.log(`No messages found for ip: ${ipAddress}`);
            return MINUTE_S * 5;
        });
    }
    canSendMessage(email, ipAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            // get email time
            // SELECT submitTime FROM message WHERE email = ? ORDER BY submitTime DESC LIMIT 1
            let emailTime = yield this.getTimeSinceEmailLastSent(email);
            // get ip time
            // SELECT submitTime FROM message WHERE ipAddress = ? ORDER BY submitTime DESC LIMIT 1
            let ipTime = yield this.getTimeSinceIPLastSent(ipAddress);
            console.log(`emailTime: ${emailTime}\nipTime: ${ipTime}`);
            if (emailTime < HALF_HOUR_S) {
                console.log("emailTime < HALF_HOUR_S");
                return {
                    canSend: false,
                    waitTime: HALF_HOUR_S - emailTime,
                };
            }
            if (ipTime < MINUTE_S * 5) {
                console.log("ipTime < MINUTE_S * 5");
                return {
                    canSend: false,
                    waitTime: MINUTE_S * 5 - ipTime,
                };
            }
            return { canSend: true };
        });
    }
    getAllMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            let query = "SELECT * FROM message ORDER BY submitTime DESC;";
            let rows = yield this.query(query);
            return rows;
        });
    }
}
