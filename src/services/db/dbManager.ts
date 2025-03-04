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
    private queries = new Map<string, string>()

    constructor(adapter: T, { allowDirectQueries, allowTransactions, modelPath, queriesPath }: DbManagerArgs) {
        this.adapter = adapter;
        allowDirectQueries && (this.allowDirectQueries = allowDirectQueries);
        allowTransactions && (this.allowTransactions = allowTransactions);
        modelPath && (this.modelPath = modelPath);
        queriesPath && (this.queriesPath = queriesPath);
    }

    public async connect(): Promise<this> {
        await this.adapter.connect();
        this.queriesPath && (this.queries = await DbManager.loadQueriesFile(this.queriesPath));
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

    public async executeQueryByName(name: string, ...args: any[]): Promise<any> {
        if (this.queries.size === 0)
            throw new Error("Queries are not loaded");

        const query = this.queries.get(name) ?? (new Error("Query not found"));
        if (query instanceof Error) 
            throw query;

        return await this.query(query, args);
    }

    public async executeQuery(query: string): Promise<any> {
        if (!this.allowDirectQueries) 
            throw new Error("Direct queries are not allowed");

        return await this.query(query)
    }

    public async beginTransaction(): Promise<this> {
        if (!this.allowTransactions) 
            throw new Error("Transactions are not allowed");

        await this.query("BEGIN");
        return this;
    }

    public async commitTransaction(): Promise<this> {
        if (!this.allowTransactions) 
            throw new Error("Transactions are not allowed");

        await this.query("COMMIT");
        return this;
    }

    public async rollbackTransaction(): Promise<this> {
        if (!this.allowTransactions) 
            throw new Error("Transactions are not allowed");

        await this.query("ROLLBACK");
        return this;
    }

    public async buildFromQueries(queries: string[]): Promise<this> {
        queries.forEach((query) => {  
            this.executeQuery(query);
        });
        return this;
    }

    public async buildFromModelFile(): Promise<this> {
        if (!this.modelPath) 
            throw new Error("Model path is not provided");

        const model = await DbManager.loadModelFile(this.modelPath);
        model.forEach((query) => {  
            this.query(query);
        });
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
