import { PoolConfig, Pool, QueryResult } from 'pg';
import { DbAdapter } from '@/services/db/dbManager';

export default class PgAdapter implements DbAdapter {
    private pool!: Pool;
    private config: PoolConfig
    constructor(config: PoolConfig) {
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