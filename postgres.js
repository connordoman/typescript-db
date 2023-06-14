/*
 * Created on Tue Jun 13 2023
 * Copyright (c) 2023 Connor Doman
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Client } from "pg";
export class PostgresDatabase {
    constructor(config) {
        this.connected = false;
        this.inTransaction = false;
        this.config = config;
        this.client = new Client(config);
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.inTransaction || this.connected)
                return true;
            try {
                yield this.client.connect();
                console.log("Connected to Postgres");
            }
            catch (err) {
                console.error(`Could not connect to Postgres: ${err}`);
                return false;
            }
            this.connected = true;
            return true;
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.inTransaction)
                return false;
            else if (!this.connected)
                return true;
            try {
                yield this.client.end();
                console.log("Disconnected from Postgres");
            }
            catch (err) {
                console.error(`Could not disconnect from Postgres: ${err}`);
                return false;
            }
            this.connected = false;
            return true;
        });
    }
    query(query, values) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield this.client.query(query, values);
                return res;
            }
            catch (err) {
                console.error(err);
            }
            return { rows: [], command: "", rowCount: 0, oid: 0, fields: [] };
        });
    }
    begin() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.connected)
                this.connect();
            yield this.query("BEGIN");
            this.inTransaction = true;
        });
    }
    commit() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.query("COMMIT");
            this.inTransaction = false;
            yield this.disconnect();
        });
    }
    rollback() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.query("ROLLBACK");
            this.inTransaction = false;
            yield this.disconnect();
        });
    }
    serverTime() {
        return __awaiter(this, void 0, void 0, function* () {
            const { rows } = yield this.query("SELECT NOW()");
            if (rows)
                return rows[0].now;
            return "[Time Not Found]";
        });
    }
    toString() {
        let res = "Postgres Database:\n";
        return res + JSON.stringify(this.config, null, 4);
    }
}
