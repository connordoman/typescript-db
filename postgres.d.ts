import { Client, ClientConfig } from "pg";
export declare class PostgresDatabase {
    config: ClientConfig;
    client: Client;
    inTransaction: boolean;
    constructor(config: ClientConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query(query: string, values?: any[]): Promise<any[] | undefined>;
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    serverTime(): Promise<string>;
    toString(): string;
}
