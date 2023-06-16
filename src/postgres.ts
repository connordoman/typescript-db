/*
 * Created on Tue Jun 13 2023
 * Copyright (c) 2023 Connor Doman
 */

import { Client, ClientConfig, Pool, QueryResult } from "pg";

export class PostgresDatabase {
    config: ClientConfig;
    client: Client;
    pool?: Pool;
    connected: boolean = false;
    inTransaction: boolean = false;
    timezone: string;
    locale: string;

    constructor(config: ClientConfig, pool?: boolean) {
        this.config = config;
        this.client = new Client(config);
        if (pool) {
            this.pool = new Pool(config);
        }
        this.timezone = "UTC";
        this.locale = "en-GB";
    }

    async connect(): Promise<boolean> {
        if (this.connected) return true;
        try {
            if (this.pool) await this.pool.connect();
            else await this.client.connect();
            console.log("Connected to Postgres");
        } catch (err) {
            console.error(`Could not connect to Postgres: ${err}`);
            return false;
        }
        this.connected = true;
        return true;
    }
    
    async disconnect(): Promise<boolean> {
        if (this.inTransaction) return false;
        else if (!this.connected) return true;
        try {
            if (this.pool) await this.pool.end();
            else await this.client.end();
            console.log("Disconnected from Postgres");
        } catch (err) {
            console.error(`Could not disconnect from Postgres: ${err}`);
            return false;
        }
        this.connected = false;
        return true;
    }

    async query(query: string, values?: any[]): Promise<QueryResult<any>> {
        try {
            if (this.pool) return await this.pool.query(query, values);
            else return await this.client.query(query, values);
        } catch (err) {
            console.error(err);
        }
        return { rows: [], command: "", rowCount: 0, oid: 0, fields: [] };
    }

    async begin() {
        // if (!this.connected) await this.connect();
        await this.query("BEGIN");
        this.inTransaction = true;
    }

    async commit() {
        await this.query("COMMIT");
        this.inTransaction = false;
        // await this.disconnect();
    }

    async rollback() {
        await this.query("ROLLBACK");
        this.inTransaction = false;
        // await this.disconnect();
    }

    async serverTime(): Promise<string> {
        const {rows} = await this.query("SELECT NOW()");
        const date = new Date(rows[0].now);
        if (rows) return date.toLocaleDateString(this.locale, {timeZone: this.timezone}) + " " + date.toLocaleTimeString(this.locale, {timeZone: this.timezone});
        return "[Time Not Found]";
    }

    toString(): string {
        let res = "Postgres Database:\n";
        return res + JSON.stringify(this.config, null, 4);
    }
}
