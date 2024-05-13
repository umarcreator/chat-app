const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const con = require('./dbUrl');
// const path = require('path');

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
        // const message = new Message({ senderId, receiverId, text });
        // await message.save();
        const message = { senderId, receiverId, text };
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const query = `INSERT INTO messages(sender,receiver,text,date) VALUES('${senderId}','${receiverId}','${text}','${date}')`;
        con.query(query, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                io.emit(`receive:message:${receiverId}`, message);
                console.log('emitter called: ', message);
            }
        });
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