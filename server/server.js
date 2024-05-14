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
        let allSenderMessages;
        let allReceiverMessages;
        let senderMessagesAtoZ = {};
        let receiverMessagesAtoZ = {};
        if(result.length > 0) {
          result.map(i => {
            if(i.user == senderId) {
              if(JSON.parse(i.data)[receiverId]) {
                allSenderMessages = JSON.parse(i.data)[receiverId];
              } else {
                allSenderMessages = [];
                // new
                // if(JSON.parse(i.data)[senderId]) {
                //   allReceiverMessages = JSON.parse(i.data)[senderId];
                // }
              }
              senderMessagesAtoZ = JSON.parse(i.data);
            }
            if(i.user == receiverId) {
              if(JSON.parse(i.data)[senderId]) {
                allReceiverMessages = JSON.parse(i.data)[senderId];
              } else {
                allReceiverMessages = [];
                // new
                // if(JSON.parse(i.data)[receiverId]) {
                //   allSenderMessages = JSON.parse(i.data)[receiverId];
                // }
              }
              receiverMessagesAtoZ = JSON.parse(i.data);
            }
          });
          const insert = async (user, otherUser, allMessages, allMessagesAtoZ) => {
            console.log('allMessages & data: ', allMessages, message);
            let query;
            // if(allMessages == undefined) {
            //   allMessages.push(message);
            //   allMessagesAtoZ[otherUser] = allMessages;
            // } else if(allMessages.length > 0) {
            if(allMessages == undefined) {
              console.log('allMessages == undefined: receiver, sender, allMessages, AtoZ', user, otherUser, allMessages, allMessagesAtoZ);
              query = `INSERT INTO messages2(user,data,last_updated) VALUES('${user}','${JSON.stringify({ [otherUser]: [message] })}','${date}')`;
              const result = await queryAsync(query);
              return result;
            } else if(allMessages?.length > 0 || allMessages?.length == 0) {
              allMessages.push(message);
              allMessagesAtoZ[otherUser] = allMessages;
              query = `UPDATE messages2 SET data='${JSON.stringify(allMessagesAtoZ)}' WHERE user='${user}'`;
              const result = await queryAsync(query);
              return result;
            }
            // allMessages.push(message);
            // allMessagesAtoZ[otherUser] = allMessages;
            // const query = `UPDATE messages2 SET data='${JSON.stringify(allMessagesAtoZ)}' WHERE user='${user}'`;
          }
          await Promise.all([insert(senderId, receiverId,allSenderMessages, senderMessagesAtoZ), insert(receiverId, senderId, allReceiverMessages, receiverMessagesAtoZ)]);
        } else {
          // allSenderMessages.push();
          // allReceiverMessages.push({ [senderId]: [message] });
          const query = `INSERT INTO messages2(user,data,last_updated) VALUES('${senderId}','${JSON.stringify({ [receiverId]: [message] })}','${date}')`;
          const query2 = `INSERT INTO messages2(user,data,last_updated) VALUES('${receiverId}','${JSON.stringify({ [senderId]: [message] })}','${date}')`;
          const result = await Promise.all([queryAsync(query), queryAsync(query2)]);
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