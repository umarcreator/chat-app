import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom';
import io from 'socket.io-client'

const Chat = () => {
    const [messages, setMessages] = useState({});
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);
    // const [val, setVal] = useState({});
    // console.log('messages state: ', messages);
    const [inputMessage, setInputMessage] = useState('');
    const [receiverId, setReceiverId] = useState('');
    const senderId = useParams().id;
    const socket = io('http://localhost:3000');
    // senderId = MyID
    useEffect(() => {
      console.log('myId: ', senderId);
      const socketHandler = message => {
        // console.log('message received: ', message, message.text);
        const receiverId = message.senderId;
        const messages = messagesRef.current;
        if(messages[receiverId]) {
            let temp = {...messages};
            temp[receiverId].push({ data: message.text, pos: 'left'});
            setMessages(temp);
        } else {
            setMessages(prev => ({...prev, [receiverId]: [{ data: message.text, pos: 'left'}]}));
        }
      }
      socket.on(`receive:message:${senderId}`, socketHandler);
      
      return () => {
          socket.off(`receive:message:${senderId}`, socketHandler);
        // socket.disconnect();
      };
    }, []);
  
    const sendMessage = (rId, rMessage) => {
    // const sendMessage = () => {
        // console.log('sendMessage called!');
      if (inputMessage.trim() !== '' || rMessage !== '') {
        const receiverIdNew = rMessage ? rId : receiverId;
        // console.log('receiverIdNew: ', receiverIdNew, rId, rMessage, receiverId);
        if(receiverIdNew === senderId) {
            return alert('you can\'t message yourself!');
        }
        let newMessage;
        if(rId !== undefined && rMessage !== undefined) {
            newMessage = {
                senderId: senderId,
                receiverId: rId,
                text: rMessage
            }
        } else {
            newMessage = {
                senderId,
                receiverId,
                text: inputMessage
            }
        }
        const tempM = rMessage ? rMessage : inputMessage;
        if(messages[receiverIdNew]) {
            let temp = {...messages};
            temp[receiverIdNew].push({ data: tempM, pos: 'right'});
            setMessages(temp);
        } else {
            setMessages(prev => ({...prev, [receiverIdNew]: [{ data: tempM, pos: 'right'}]}));
        }
        socket.emit('send:message', newMessage);
        setInputMessage('');
        console.log('message sent successfully to: ', receiverIdNew);
      }
    };
  
    return (
      <main className='chat-container'>
        <div className="input">
            <label htmlFor='receiverId'>Enter your receiver id: </label>
            <input type="text" id='receiverId' value={receiverId} onChange={e => setReceiverId(e.target.value)} />
            <br/>
            <br/>
            <label htmlFor='message'>Write your message: </label>
            <input type="text" id='message' value={inputMessage} onChange={e => setInputMessage(e.target.value)} onKeyUp={e => e.key === 'Enter' && sendMessage()} />
            <br/>
            <button style={{ marginTop: 15 }} onClick={sendMessage}>Send</button>
        </div>
        <div className="messages">
            <h1 className='heading'>Messages</h1>
            {Object.keys(messages)?.map(i => {
                return <div className='chat-head'>
                    <h3>Client name: {i}</h3>
                    <div className='message'>
                    {messages[i]?.map(i => <div className={i.pos}>{i.data}</div>)}
                    </div>
                    {/* <input type="text" placeholder='Reply here' val={val[i]} onChange={e => setVal(prev => ({...prev, [i]: e.target.value}))} />
                    <button onClick={() => sendMessage(i, val[i])}>Send</button> */}
                    <ReplyComponent i={i} sendMessage={sendMessage} />
                </div>
            })}
        </div>
      </main>
    )
}

const ReplyComponent = ({i, sendMessage}) => {
    const [val, setVal] = useState('');
    const messageHandler = () => { 
        sendMessage(i, val);
        setVal('');
    }
    return (
        <>
            <input type="text" placeholder='Reply here' value={val} onChange={e => setVal(e.target.value)} onKeyUp={e => e.key === 'Enter' && messageHandler()} />
            <button onClick={messageHandler}>Send</button>
        </>
    )
}

export default Chat
