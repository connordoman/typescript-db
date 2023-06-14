/*
 * Created on Tue Jun 13 2023
 * Copyright (c) 2023 Connor Doman
 */

import { Client, ClientConfig, QueryResult } from "pg";

export class PostgresDatabase {
    config: ClientConfig;
    client: Client;
    inTransaction: boolean = false;

    constructor(config: ClientConfig) {
        this.config = config;
        this.client = new Client(config);
    }

    async connect() {
        await this.client.connect();
        console.log("Connected to Postgres");
    }

    async disconnect() {
        if (!this.inTransaction) await this.client.end();
    }

    async query(query: string, values?: any[]): Promise<QueryResult<any>> {
        try {
            const res: QueryResult<any> = await this.client.query(query, values);
            return res;
        } catch (err) {
            console.error(err);
        } finally {
            this.disconnect();
        }
        return { rows: [], command: "", rowCount: 0, oid: 0, fields: [] };
    }

    async begin() {
        await this.query("BEGIN");
        this.inTransaction = true;
    }

    async commit() {
        await this.query("COMMIT");
        this.inTransaction = false;
        await this.disconnect();
    }

    async rollback() {
        await this.query("ROLLBACK");
        this.inTransaction = false;
        await this.disconnect();
    }

    async serverTime(): Promise<string> {
        const {rows} = await this.query("SELECT NOW()");
        if (rows) return rows[0].now;
        return "[Time Not Found]";
    }

    toString(): string {
        let res = "Postgres Database:\n";
        return res + JSON.stringify(this.config, null, 4);
    }
}
