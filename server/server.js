const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const con = require('./dbUrl');
// const path = require('path');
const util = require('util');
const queryAsync = util.promisify(con.query).bind(con);

const app = express();
// app.use(cors({}));
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}))

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    }
});

// Assuming you have a function to authenticate users
const authenticateUser = (userId) => {
  // Your authentication logic here, e.g., checking user's JWT token
  if(userId) {
      return true;
  }
};

io.on('connection', socket => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  socket.on('send:message', async ({ senderId, receiverId, text }) => {
    try {
      if (authenticateUser(senderId) && authenticateUser(receiverId) && text) {
        const messageData = { senderId, receiverId, text };
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const message = {
          sender: senderId,
          receiver: receiverId,
          text: text,
          date: date,
          read: false,
          sent: false
        }
        const querySelect = `SELECT * FROM messages2 WHERE user='${senderId}' OR user='${receiverId}'`;
        const result = await queryAsync(querySelect);
        console.log('existing messages: ', result);
        let allSenderMessages = [];
        let allReceiverMessages = [];
        if(result.length > 0) {
          result.map(i => {
            if(i.user == senderId) {
              allSenderMessages = JSON.parse(i.data);
            }
            if(i.user == receiverId) {
              allReceiverMessages = JSON.parse(i.data);
            }
          });
          const insert = async (user, allMessages) => {
            console.log('allMessages & data: ', allMessages, message);
            let query;
            if(allMessages.length > 0) {
              allMessages.push(message);
              query = `UPDATE messages2 SET data='${JSON.stringify(allMessages)}' WHERE user='${user}'`;
            } else {
              allMessages.push(message);
              query = `INSERT INTO messages2(user,data,last_updated) VALUES('${user}','${JSON.stringify(allMessages)}','${date}')`;
            }
            const result = await queryAsync(query);
            return result;
          }
          await Promise.all([insert(senderId, allSenderMessages), insert(receiverId, allReceiverMessages)]);
        } else {
          allSenderMessages.push(message);
          allReceiverMessages.push(message);
          const query = `INSERT INTO messages2(user,data,last_updated) VALUES('${senderId}','${JSON.stringify(allSenderMessages)}','${date}')`;
          const query2 = `INSERT INTO messages2(user,data,last_updated) VALUES('${receiverId}','${JSON.stringify(allReceiverMessages)}','${date}')`;
          const result = queryAsync(query);
          const result2 = queryAsync(query2);
          await Promise.all([result, result2]);
        }
        io.emit(`receive:message:${receiverId}`, messageData);
        console.log('emitter called: ', messageData);
      } else {
        // Handle unauthorized access
        console.log('Unauthorized access');
      }
    } catch (error) {
      console.log('Error sending message:', error);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 