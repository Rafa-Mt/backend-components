import express, { Request, RequestHandler, Response, json } from 'express';
import { config as dotenv } from 'dotenv';
import DbManager from "@db/dbManager";
import PgAdapter from '@db/pgAdapter';
import CacheManager from '@db/cacheManager';
import SessionManager from '@security/sessionManager';

dotenv();

const app = express();
app.use(json());
const port = Number(process.env.port);

const dbAdapter = new PgAdapter({
	database: "test",
})

const dbManager = new DbManager(dbAdapter, { 
	allowDirectQueries: true, 
	modelPath: "src/config/db/model.yml",
	queriesPath: "src/config/db/queries.toml"
});
await dbManager.connect();

interface UserType {
	email: string;
	password: string;
}


const cache = await CacheManager.create({dbName: "cache", collections: ["auth", "tokens"]})
const [authCache, tokenBlacklist] = cache.getCollections("auth", "tokens")

const sessionManager = new SessionManager<UserType>({
	secret: process.env.SESSION_SECRET as string,
	expiresIn: '5d',
	blacklistCollection: tokenBlacklist
})


app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
})

const closeCallback = async () => {
	console.log("Closing server")
	await cache.disconnect()
	await dbManager.disconnect()
}

process.on('SIGTERM', closeCallback)
process.on('SIGINT', closeCallback)
process.on('exit', closeCallback)
