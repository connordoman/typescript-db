import * as mysql from "mysql2/promise";
export declare const MINUTE_S = 60;
export declare const HOUR_S: number;
export declare const HALF_HOUR_S: number;
export declare const DAY_S: number;
export declare const WEEK_S: number;
export declare const MONTH_S: number;
export declare const YEAR_S: number;
export declare const DB_CONFIG: mysql.PoolOptions;
export declare class Database {
    host: string | undefined;
    user: string | undefined;
    password: string | undefined;
    database: string | undefined;
    waitForConnections: boolean | undefined;
    connectionLimit: number | undefined;
    queueLimit: number | undefined;
    timezone: string | undefined;
    pool: mysql.Pool;
    connection: mysql.Connection | undefined;
    constructor(options?: mysql.PoolOptions);
    getDBConfig(): mysql.PoolOptions;
    getConnection(pool?: mysql.Pool): Promise<mysql.Connection | undefined>;
    createConnection(pool?: mysql.Pool): Promise<mysql.Connection>;
    close(): Promise<void>;
    query(query: string, values?: any[]): Promise<any>;
    startTransaction(pool?: mysql.Pool): Promise<boolean>;
    commitTransaction(): Promise<boolean>;
}
export type ContactMessage = {
    firstName: string;
    lastName: string;
    email: string;
    messageSubject: string;
    messageText: string;
    submitTime?: string;
    ipAddress?: string;
};
export type SendStatus = {
    canSend: boolean;
    waitTime?: number;
};
export declare class MessageDatabase extends Database {
    constructor(options?: mysql.PoolOptions);
    insertMessage(message: ContactMessage): Promise<boolean>;
    deleteMessage(email: string, ipAddress: string, submitTime: string): Promise<boolean>;
    getTimeSinceEmailLastSent(email: string): Promise<number>;
    getTimeSinceIPLastSent(ipAddress: string): Promise<number>;
    canSendMessage(email: string, ipAddress: string): Promise<SendStatus>;
    getAllMessages(): Promise<ContactMessage[]>;
}
