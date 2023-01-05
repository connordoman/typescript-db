/*
 * Created on Fri Dec 16 2022
 * Copyright (c) 2022 Connor Doman
 */
import * as mysql from "mysql2/promise";

export const MINUTE_MS = 1000 * 60; // 60,000ms
export const HOUR_MS = MINUTE_MS * 60;
export const HALF_HOUR_MS = HOUR_MS / 2;
export const DAY_MS = HOUR_MS * 24;
export const WEEK_MS = DAY_MS * 7;
export const MONTH_MS = DAY_MS * 30;
export const YEAR_MS = DAY_MS * 365;

export const DB_CONFIG = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    // database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

export class Database {
    host: string | undefined;
    user: string | undefined;
    password: string | undefined;
    // database: string | undefined;
    waitForConnections: boolean | undefined;
    connectionLimit: number | undefined;
    queueLimit: number | undefined;
    pool: mysql.Pool;
    connection: mysql.Connection | undefined = undefined;

    constructor(options?: mysql.PoolOptions) {
        if (options) {
            this.host = options.host;
            this.user = options.user;
            this.password = options.password;
            // this.database = options.database;
            this.waitForConnections = options.waitForConnections;
            this.connectionLimit = options.connectionLimit;
            this.queueLimit = options.queueLimit;
        } else {
            this.host = DB_CONFIG.host;
            this.user = DB_CONFIG.user;
            this.password = DB_CONFIG.password;
            // this.database = DB_CONFIG.database;
            this.waitForConnections = DB_CONFIG.waitForConnections;
            this.connectionLimit = DB_CONFIG.connectionLimit;
            this.queueLimit = DB_CONFIG.queueLimit;
        }

        this.pool = mysql.createPool(this.getDBConfig());

        if (this.pool) console.log(`Connected to MySQL database with config: '${JSON.stringify(DB_CONFIG, null, 4)}'`);
    }

    getDBConfig = (): mysql.PoolOptions => {
        return {
            host: this.host,
            user: this.user,
            password: this.password,
            // database: this.database,
            waitForConnections: this.waitForConnections,
            connectionLimit: this.connectionLimit,
            queueLimit: this.queueLimit,
        };
    };

    getConnection = async (pool?: mysql.Pool): Promise<mysql.Connection | undefined> => {
        try {
            let conn: mysql.Connection;

            if (!this.connection) {
                if (pool) {
                    conn = await this.createConnection(pool);
                } else {
                    conn = await this.createConnection();
                }
                return conn;
            }
        } catch (err: any) {
            console.error(`Error in database.getConnection: ${err}`);
            return undefined;
        }
        return this.connection;
    };

    createConnection = async (pool?: mysql.Pool): Promise<mysql.Connection> => {
        if (pool) {
            this.connection = await pool.getConnection();
        }
        this.connection = await this.pool.getConnection();
        return this.connection;
    };

    close = async (): Promise<void> => {
        if (this.connection) {
            await this.connection.end();
            this.connection = undefined;
        }
        await this.pool.end();
    };

    query = async (query: string, values?: any[]): Promise<any> => {
        try {
            let conn: mysql.Connection | undefined = await this.getConnection();
            if (conn) {
                query = query.trim();
                if (query[query.length - 1] !== ";") query += ";";

                let [rows] = await conn.query(query, values);
                return rows;
            }
        } catch (err: any) {
            console.error(`Error in database.query: ${err}`);
            return undefined;
        }
        return undefined;
    };

    startTransaction = async (pool?: mysql.Pool): Promise<boolean> => {
        let conn = await this.getConnection(pool);
        if (conn) {
            await conn.beginTransaction();
            return true;
        }
        return false;
    };

    commitTransaction = async (): Promise<boolean> => {
        let conn = await this.getConnection();
        if (conn) {
            await conn.commit();
            await conn.end();
            this.connection = undefined;
            return true;
        }
        return false;
    };
}

// messages database

export type ContactMessage = {
    firstName: string;
    lastName: string;
    email: string;
    messageSubject: string;
    messageText: string;
    submitTime: number;
    ipAddress: string;
};

export class MessageDatabase extends Database {
    constructor(options?: mysql.PoolOptions) {
        super({ ...DB_CONFIG, database: "messages", ...options });
    }

    insertMessage = async (message: ContactMessage): Promise<boolean> => {
        let query =
            "INSERT INTO message (firstName, lastName, email, messageSubject, messageText, submitTime, ipAddress) VALUES (?, ?, ?, ?, ?, DATETIME(?), ?);";
        let values = [
            message.firstName,
            message.lastName,
            message.email,
            message.messageSubject,
            message.messageText,
            message.submitTime,
            message.ipAddress,
        ];
        let [rows] = await this.query(query, values);
        return rows.length > 0;
    };

    getLastMessageTimeByEmail = async (email: string): Promise<number> => {
        let query = "SELECT submitTime FROM message WHERE email = ? ORDER BY submitTime DESC LIMIT 1";
        let values = [email];
        let [rows] = await this.query(query, values);
        if (rows && rows.length > 0) {
            let date = new Date(rows[0].submitTime);
            return date.getTime();
        }
        return HALF_HOUR_MS;
    };

    getLastMessageTimeByIpAddress = async (ipAddress: string): Promise<number> => {
        let query = "SELECT submitTime FROM message WHERE ipAddress = ? ORDER BY submitTime DESC LIMIT 1";
        let values = [ipAddress];
        let [rows] = await this.query(query, values);
        if (rows && rows.length > 0) {
            let date = new Date(rows[0].submitTime);
            return date.getTime();
        }
        return MINUTE_MS * 5;
    };

    canSendMessage = async (email: string, ipAddress: string): Promise<boolean> => {
        // get email time
        // SELECT submitTime FROM message WHERE email = ? ORDER BY submitTime DESC LIMIT 1
        let emailTime = await this.getLastMessageTimeByEmail(email);
        // get ip time
        // SELECT submitTime FROM message WHERE ipAddress = ? ORDER BY submitTime DESC LIMIT 1
        let ipTime = await this.getLastMessageTimeByIpAddress(ipAddress);

        let now = Date.now();

        if (now - emailTime > HALF_HOUR_MS) {
            return true;
        }

        if (now - ipTime > MINUTE_MS * 5) {
            return true;
        }

        return false;
    };

    getAllMessages = async (): Promise<ContactMessage[]> => {
        let query = "SELECT * FROM message ORDER BY submitTime DESC;";
        let rows = await this.query(query);
        return rows;
    };
}

export class XmasDatabase extends Database {
    constructor() {
        super({ ...DB_CONFIG, database: "xmas" });
    }

    getAllRecipients = async (): Promise<any> => {
        let query = "SELECT * FROM recipient;";
        let rows = await this.query(query);
        return rows;
    };

    getAllGifts = async (): Promise<any> => {
        let query = "SELECT * FROM gift;";
        let rows = await this.query(query);
        return rows;
    };

    getRecipient = async (alias: string): Promise<any> => {
        let query = "SELECT * FROM recipient WHERE alias = ? LIMIT 1;";
        let rows = await this.query(query, [alias]);
        if (rows.length > 0) return rows[0];
        return rows;
    };

    getRecipientAndGift = async (alias: string, year?: number): Promise<any> => {
        if (!year) year = new Date().getFullYear();
        let query = "SELECT * FROM gift_recipients WHERE alias = ? AND xmasYear = ? LIMIT 1;";
        let rows = await this.query(query, [alias, year]);
        if (rows.length > 0) return rows[0];
        return rows;
    };

    getRecipientsWithGifts = async (year?: number): Promise<any> => {
        if (!year) year = new Date().getFullYear();
        let query = "SELECT * FROM gift_recipients WHERE xmasYear = ?;";
        let rows = await this.query(query, [year]);
        return rows;
    };

    getSalt = async (username: string): Promise<any> => {
        let query = "SELECT salt FROM user WHERE username = ? LIMIT 1;";
        let rows = await this.query(query, [username]);
        if (rows.length > 0) return rows[0];
        return rows;
    };

    getAliases = async (): Promise<any> => {
        let query = "SELECT alias FROM recipient;";
        let rows = await this.query(query);
        return rows;
    };

    getAliasesWithoutGifts = async (year?: number): Promise<any> => {
        if (!year) year = new Date().getFullYear();
        let query = "SELECT alias FROM DoesNotHaveGift;";
        let rows = await this.query(query, [year]);
        return rows;
    };

    getAliasesWithGifts = async (year?: number): Promise<any> => {
        if (!year) year = new Date().getFullYear();
        let query =
            "SELECT alias, ((SELECT R.alias IN (SELECT alias FROM gift_recipients)) > 0) AS hasGift FROM recipient R ORDER BY hasGift, alias ASC;";
        let rows = await this.query(query, [year]);
        return rows;
    };

    createGift = async (alias: string, gift: any): Promise<any> => {
        let query = "INSERT INTO gift (xmasYear, recipientAlias, videoURL, imageURL, message) VALUES (?, ?, ?, ?, ?);";
        let result: mysql.OkPacket = await this.query(query, [
            gift.xmasYear ? gift.xmasYear : new Date().getFullYear(),
            alias,
            gift.videoURL,
            gift.imageURL,
            gift.message,
        ]);
        return result.affectedRows > 0;
    };

    createRecipient = async (recipient: any): Promise<any> => {
        let query = "INSERT INTO recipient (alias, firstName, lastName, nickname) VALUES (?, ?, ?, ?);";
        let result: mysql.OkPacket = await this.query(query, [
            recipient.alias,
            recipient.firstName,
            recipient.lastName,
            recipient.nickname,
        ]);
        return result.affectedRows > 0;
    };

    recipientExists = async (alias: string): Promise<boolean> => {
        let query = "SELECT * FROM recipient WHERE alias = ? LIMIT 1;";
        let rows = await this.query(query, [alias]);
        return rows.length > 0;
    };

    updateRecipient = async (alias: string, recipient: any): Promise<any> => {
        let query = "UPDATE recipient SET firstName = ?, lastName = ?, nickname = ? WHERE alias = ?;";
        let result: mysql.OkPacket = await this.query(query, [
            recipient.firstName,
            recipient.lastName,
            recipient.nickname,
            alias,
        ]);
        return result.affectedRows > 0;
    };

    hasGift = async (alias: string, year?: number): Promise<boolean> => {
        if (!year) year = new Date().getFullYear();
        let query = "SELECT * FROM gift_recipients WHERE alias = ? AND xmasYear = ? LIMIT 1;";
        let rows = await this.query(query, [alias, year]);
        return rows.length > 0;
    };

    updateGift = async (alias: string, gift: any, year?: number): Promise<any> => {
        let query =
            "UPDATE gift SET videoURL = ?, imageURL = ?, message = ? WHERE recipientAlias = ? AND xmasYear = ?;";
        let result: mysql.OkPacket = await this.query(query, [
            gift.videoURL,
            gift.imageURL,
            gift.message,
            alias,
            gift.xmasYear ? gift.xmasYear : new Date().getFullYear(),
        ]);
        return result.affectedRows > 0;
    };
}
