import { Client, QueryResult } from 'pg';
import Pool, { Config } from 'pg-pool';
import { DbAdapter } from '@/services/db/dbManager';

export default class PgAdapter implements DbAdapter {
    private pool!: Pool<Client>;
    private config: Config<Client>
    constructor(config: Config<Client>) {
        this.config = config;
    }

    async connect(): Promise<void> {
        this.pool = new Pool(this.config);
    }

    async disconnect(): Promise<void> {
        await this.pool.end();
    }

    async query(query: string, ...args: any[]): Promise<QueryResult<any>> {
        const client = await this.pool.connect();
        return await client.query(query, args);
    }
}