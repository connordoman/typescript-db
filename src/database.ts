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

export const DB_CONFIG: mysql.PoolOptions = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

export class Database {
    host: string | undefined;
    user: string | undefined;
    password: string | undefined;
    database: string | undefined;
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
            this.database = options.database;
            this.waitForConnections = options.waitForConnections;
            this.connectionLimit = options.connectionLimit;
            this.queueLimit = options.queueLimit;
        } else {
            this.host = DB_CONFIG.host;
            this.user = DB_CONFIG.user;
            this.password = DB_CONFIG.password;
            this.database = DB_CONFIG.database;
            this.waitForConnections = DB_CONFIG.waitForConnections;
            this.connectionLimit = DB_CONFIG.connectionLimit;
            this.queueLimit = DB_CONFIG.queueLimit;
        }

        this.pool = mysql.createPool(this.getDBConfig());

        // if (this.pool)
        //     console.log(`Connected to MySQL database with config: '${JSON.stringify(this.getDBConfig(), null, 4)}'`);
    }

    getDBConfig = (): mysql.PoolOptions => {
        return {
            host: this.host,
            user: this.user,
            password: this.password,
            database: this.database,
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
            return [];
        }
        return [];
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
    submitTime?: number;
    ipAddress?: string;
};

export type SendStatus = {
    canSend: boolean;
    waitTime?: number;
};

export class MessageDatabase extends Database {
    constructor(options?: mysql.PoolOptions) {
        super(options ? options : { ...DB_CONFIG, database: "contact" });
    }

    insertMessage = async (message: ContactMessage): Promise<boolean> => {
        let query =
            "INSERT INTO message (firstName, lastName, email, messageSubject, messageText, submitTime, ipAddress) VALUES (?, ?, ?, ?, ?, NOW(), ?);";
        let values = [
            message.firstName,
            message.lastName,
            message.email,
            message.messageSubject,
            message.messageText,
            message.ipAddress,
        ];
        let result = await this.query(query, values);
        return result && result.affectedRows > 0;
    };

    getTimeSinceEmailLastSent = async (email: string): Promise<number> => {
        let query =
            "SELECT NOW() - submitTime AS timeSince FROM message WHERE email = ? ORDER BY submitTime DESC LIMIT 1";
        let values = [email];
        let [rows] = await this.query(query, values);
        if (rows) {
            return rows.timeSince;
        }
        console.log(`No messages found for email: ${email}`);
        return HALF_HOUR_S;
    };

    getTimeSinceIPLastSent = async (ipAddress: string): Promise<number> => {
        let query =
            "SELECT NOW() - submitTime AS timeSince FROM message WHERE ipAddress = ? ORDER BY submitTime DESC LIMIT 1";
        let values = [ipAddress];
        let [rows] = await this.query(query, values);
        if (rows) {
            return rows.timeSince;
        }
        console.log(`No messages found for ip: ${ipAddress}`);
        return MINUTE_S * 5;
    };

    canSendMessage = async (email: string, ipAddress: string): Promise<SendStatus> => {
        // get email time
        // SELECT submitTime FROM message WHERE email = ? ORDER BY submitTime DESC LIMIT 1
        let emailTime = await this.getTimeSinceEmailLastSent(email);
        // get ip time
        // SELECT submitTime FROM message WHERE ipAddress = ? ORDER BY submitTime DESC LIMIT 1
        let ipTime = await this.getTimeSinceIPLastSent(ipAddress);

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
    };

    getAllMessages = async (): Promise<ContactMessage[]> => {
        let query = "SELECT * FROM message ORDER BY submitTime DESC;";
        let rows = await this.query(query);
        return rows;
    };
}
