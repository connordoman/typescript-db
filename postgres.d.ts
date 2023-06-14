import { Client, ClientConfig, QueryResult } from "pg";
export declare class PostgresDatabase {
    config: ClientConfig;
    client: Client;
    connected: boolean;
    inTransaction: boolean;
    constructor(config: ClientConfig);
    connect(): Promise<boolean>;
    disconnect(): Promise<boolean>;
    query(query: string, values?: any[]): Promise<QueryResult<any>>;
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    serverTime(): Promise<string>;
    toString(): string;
}
