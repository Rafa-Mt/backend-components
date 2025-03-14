import express, { Request, RequestHandler, Response, json } from 'express';
import { config as dotenv } from 'dotenv';
import DbManager from "@db/dbManager";
import PgAdapter from '@db/pgAdapter';
import SessionManager from '@session/sessionManager';
import { buildManagerRoute, CustomRequest } from './services/session/sessionMiddleware.js';

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

const sessionManager = new SessionManager<UserType>({
	secret: process.env.SESSION_SECRET as string,
	expiresIn: '5d'
})

app.get('/', (req, res) => {
	res.send('Hello World');
});

app.get('/get-users', async (req: Request, res: Response) => {	
	try {
		const result = await dbManager
			.executeQueryByName('get-users') as Record<string, any>[];

		res.send(result);
	} 
	catch (e) {
		console.log(e)
		res.send('Failed to connect to database');
	}
})

app.post('/insert-user', async (req: Request, res: Response) => {
	const body = req.body as { username: string, email: string, password: string };

	try {
		await dbManager.executeQuery(
			'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)', 
			body.username, body.email, body.password
		);

		res.send('User inserted');
	}
	catch (e) {
		console.log(e);
		res.send('Failed to insert user');
	}
})

app.get('/build', async (req: Request, res: Response) => {
	try {
		await dbManager.buildFromModelFile();
		const result = await dbManager
			.executeQuery("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");

		res.send(result);
	}
	catch (e) {
		console.log(e);
		res.send('Failed to create table');
	}
})

app.post('/login', async (req: Request, res: Response) => {
	const body = req.body as { email: string, password: string };

	try {
		const token = sessionManager.createToken(body);
		res.send({...body, token});
	}
	catch (e) {
		console.log(e);
		res.send('Failed to login');
	}
})

const sessionRoute = buildManagerRoute(sessionManager) as RequestHandler;

app.get('/verify', sessionRoute, async (req: Request, res: Response) => {
	res.send((req as CustomRequest<UserType>).user);
})

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
})