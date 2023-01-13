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
    timezone: "-08:00",
});

// test db functionality
const testMessageDB = async () => {
    const { canSend, waitTime } = await messageDatabase.canSendMessage("c.doman@me.com", "::1");
    if (!canSend && waitTime) {
        console.log(`CAN'T send message, wait ${waitTime} seconds (${waitTime / 60} minutes)`);
    } else {
        console.log("CAN send message");
    }

    const allMessages = await messageDatabase.getAllMessages();
    if (allMessages) {
        //console.log(JSON.stringify(allMessages, null, 4));
    }
};

testMessageDB();
