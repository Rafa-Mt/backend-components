import { MongoMemoryServer } from "mongodb-memory-server";
import { Collection, Connection, createConnection, Document } from 'mongoose'

export interface CacheManagerArgs {
    dbName: string,
    collections: string[]
}

export default class CacheManager {
    private server!: MongoMemoryServer
    private mongoose!: Connection
    private collections!: string[];
    private isConnected: boolean = false;
    private constructor() {}

    public static async create({dbName, collections}: CacheManagerArgs): Promise<CacheManager> {
        const instance = new CacheManager()
        const cacheServer = await MongoMemoryServer.create();
        const cacheMongoose = createConnection(cacheServer.getUri(), { dbName })
        await cacheMongoose.asPromise()

        instance.server = cacheServer;
        instance.mongoose = cacheMongoose;
        instance.isConnected = false;
        
        for (const collName of collections) {    
            await cacheMongoose.createCollection(collName)
            instance.collections.push(collName)
        } 
        
        return instance;
    }

    public getCollection(collection: string): Collection {
        if (!this.collections.includes(collection))
            throw new Error("Collection not found")

        return this.mongoose.collection(collection)
    }

    public getCollections(...collections: string[]) {
        return collections.map((coll) => this.getCollection(coll))
    }

    public async disconnect() {
        if (!this.isConnected)
            return;

        await this.mongoose.close()
        await this.server.stop()
    }
}