import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import yaml from "js-yaml";
import toml from "toml";

type DbTypes = number | string | boolean | Date | null;
type ResultRecord = Record<string, DbTypes>;

export interface DbAdapter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query(query: string, ...args: any[]): Promise<any>;   
}

export interface DbManagerArgs {
    allowDirectQueries?: boolean;
    allowTransactions?: boolean;
    modelPath?: string;
    queriesPath?: string;
}


export default class DbManager<T extends DbAdapter> {
    private adapter: T;
    private isConnected: boolean = false;
    private allowDirectQueries: boolean = false;
    private allowTransactions: boolean = false;
    private modelPath?: string;
    private queriesPath?: string;
    // private queries: Map<string, string>;

    constructor(adapter: T, { allowDirectQueries, allowTransactions }: DbManagerArgs) {
        this.adapter = adapter;
        allowDirectQueries && (this.allowDirectQueries = allowDirectQueries);
        allowTransactions && (this.allowTransactions = allowTransactions);
    }

    public async connect(): Promise<DbManager<T>> {
        await this.adapter.connect();
        this.isConnected = true;
        return this;
    }

    public async disconnect(): Promise<void> {
        await this.adapter.disconnect();
    }

    private async query(query: string, ...args: any[]): Promise<any> {
        if (!this.isConnected) 
            throw new Error("DB is not connected");
        
        return await this.adapter.query(query, args);
    }

    public async executeQuery(query: string): Promise<any> {
        if (!this.allowDirectQueries) 
            throw new Error("Direct queries are not allowed");

        return await this.query(query)
    }

    async beginTransaction(): Promise<DbManager<T>> {
        if (!this.allowTransactions) 
            throw new Error("Transactions are not allowed");

        await this.query("BEGIN");
        return this;
    }

    async commitTransaction(): Promise<DbManager<T>> {
        if (!this.allowTransactions) 
            throw new Error("Transactions are not allowed");

        await this.query("COMMIT");
        return this;
    }

    async rollbackTransaction(): Promise<DbManager<T>> {
        if (!this.allowTransactions) 
            throw new Error("Transactions are not allowed");

        await this.query("ROLLBACK");
        return this;
    }

    private static async loadModelFile(path: string): Promise<string[]> {
        const file = await this.loadConfigFile(path);
        return Object.values(file['queries'] as unknown as Record<string, string>)
            .map((query) => query.trim())
    }

    private static async loadQueriesFile(path: string): Promise<Map<string, string>> {
        const queryMap = new Map<string, string>();
        const file = await this.loadConfigFile(path);
        Object.entries(file['queries'] as unknown as Record<string, string>)
            .forEach(([key, value]) => {
                queryMap.set(key, value.trim());
            })

        return queryMap;
    }

    private static async loadConfigFile(path: string): Promise<ResultRecord> {
        const filePath = join(path);
        const ext = extname(filePath);

        try {
            const content = await readFile(filePath, "utf-8");
            let parsed: ResultRecord;
            
            switch (ext) {
                case ".json":
                    parsed = JSON.parse(content);
                    break;
                case '.yaml':
                case '.yml':
                    parsed = yaml.load(content) as ResultRecord;
                    break;
                case '.toml':
                    parsed = toml.parse(content);
                    break;
                default:
                    throw new Error("Unsupported file type");
            }
            return parsed;
        }
        catch (error) {
            throw new Error(`Failed to parse file: ${filePath}: ${(error as Error).message}`);
        }
    }
}
