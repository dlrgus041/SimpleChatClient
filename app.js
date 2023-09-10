import express from 'express';
import jade from 'jade';
import { WebSocketServer } from 'ws';
import { StringDecoder } from 'string_decoder';
        
const app = express();

app.use(express.static('public'));
app.set('view engine', 'jade');

app.listen(3000, () => {
    console.log('Example app listening on port 3000!');
});

app.get('/hello', (req, res) => {
    res.render('hello');
});

const wss = new WebSocketServer({ port: 8080 });
const decoder = new StringDecoder('utf8');

const map = new Map();

wss.on('connection', (ws) => {

    function broadcast(data) {
        for (const websocket of map.values()) {
            websocket.send(JSON.stringify(data));
        }
    }

    ws.on('close', (code, reason) => {
        map.delete(reason.toString());
        broadcast({ 'type': 'Goodbye', 'sender': reason.toString() });
    });
  
    ws.on('message', (rawdata) => {
        const data = JSON.parse(rawdata);

        switch (data['type']) {
            case 'Welcome':
                broadcast(data);
                map.set(data['sender'], ws);
                break;
            case 'Message':
                broadcast(data);
                break;
        }
    });
});