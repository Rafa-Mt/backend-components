import express from 'express';
import { config as dotenv } from 'dotenv';
import DbManager from "@db";

dotenv();

const app = express();
const port = Number(process.env.port);

app.get('/', (req, res) => {
	res.send('Hello World');
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
})