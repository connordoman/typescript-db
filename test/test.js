import * as dotenv from "dotenv";
import { MessageDatabase } from "../lib/database.js";

// wake up environment
dotenv.config();

// const xmasDatabase = new XmasDatabase();
const messageDatabase = new MessageDatabase({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// test db functionality
(async () => {
    const messages = await messageDatabase.getAllMessages();
    console.log(JSON.stringify(messages, null, 4));
})();
