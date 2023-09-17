import variables from "./variables.js";

// HTML elements
const groupChatArea = document.querySelector('#groupChatArea');
const memberArea = document.querySelector('#memberArea');
const chatRoomArea = document.querySelector('#chatRoomArea');
const toastArea = document.querySelector('#toastArea');

const groupChatForm = document.querySelector('#groupChatForm');
const alertForm = document.querySelector('#alertForm');
const memberForm = document.querySelector('#memberForm');
const chatRoomForm = document.querySelector('#chatRoomForm');
const modalForm = document.querySelector('#modalForm');
const toastForm = document.querySelector('#toastForm');

const chatRooms = new Map();

// functions
function displayAlert(type, message) {
    const node = alertForm.cloneNode(true);
    node.style.display = 'block';
    node.classList.add(`alert-${type}`);
    node.innerHTML = message;
    groupChatArea.appendChild(node);
};

function displayMessage(payload) {
    const isMine = (payload['sender'] === variables.nickname);

    const node = groupChatForm.cloneNode(true);
    node.style.display = 'block';
    node.style.textAlign = isMine ? 'right' : 'left';

    node.children[0].classList.add(isMine ? 'mine' : 'other');
    node.children[0].innerHTML = (isMine? '' : (payload['sender'] + ': ')) + payload['message'];

    elements.groupChatArea.appendChild(node);
};

function setEnablity(enablity, ...ids) {
    for (const id of ids) {
        document.querySelector(id).disabled = !enablity;
    }
}

function sendMessage(type, receiver = null, message = null, chatRoomId = 0) {
    variables.ws.send(JSON.stringify({
        'type': type,
        'sender': variables.nickname,
        'receiver': receiver,
        'message': message,
        'chatRoomId': chatRoomId
    }));
}

function addMember(memberName) {

    const node = memberForm.cloneNode(true);
    node.style.display = 'block';
    node.children[0].children[0].children[0].innerHTML = memberName;

    node.children[0].children[1].children[0].addEventListener('click', () => {
        displayModal(
            `Invite ${memberName}`,
            `Invite ${memberName} to ChatRoom. Continue?`,
            () => {
                sendMessage('Invite', memberName);
                displayToast(`Send invitation to ${memberName}.`);
            }
        );
    });

    node.children[0].children[1].children[1].addEventListener('click', () => {
        displayModal(
            `Whisper to ${memberName}`,
            `<input id="whisperMessage" class="form-control ms-2 me-2" placeholder="Type whisper message here">`,
            () => {
                const message = document.querySelector('#whisperMessage').value;
                sendMessage('Whisper', memberName, message);
                displayToast(`Succefully whispered to ${memberName}.`);
                displayAlert('secondary', `Whispers to ${memberName}: ${message}`);
            }
        );
    });

    memberArea.appendChild(node);
}

function clearMember() {
    memberArea.textContent = '';
}

function addChatRoom(chatRoomId, chatRoomName) {

    const node = chatRoomForm.cloneNode(true);
    node.style.display = 'block';
    node.dataset.id = chatRoomId;

    node.children[0].children[0].children[0].innerHTML = chatRoomName;
    // node.children[0].children[1].children[0].addEventListener('click', () => {
    //     sendMessage('Invite', member);
    // });
    // node.children[0].children[1].children[1].addEventListener('click', () => {
    //     sendMessage('Whisper', member);
    // });
    
    chatRooms.set(chatRoomId, node);
    chatRoomArea.appendChild(node);
}

function displayModal(title, body, callback) {
    modalForm.children[0].children[0].children[0].children[0].innerHTML = title;
    modalForm.children[0].children[0].children[1].innerHTML = body;
    modalForm.children[0].children[0].children[2].children[0].addEventListener('click', callback);
    new bootstrap.Modal(modalForm).show();
}

function displayToast(body, callback) {
    const node = toastForm.cloneNode(true);
    node.addEventListener('click', callback);
    node.children[0].innerHTML = body;
    toastArea.appendChild(node);
    bootstrap.Toast.getOrCreateInstance(node).show();    
}

// listeners
// TODO: websocket activities(line 123 ~ line 175) will be move to "websocket.js" file.
document.querySelector('#connect').addEventListener('click', () => {

    if (document.querySelector('#nickname').value === '') {
        displayAlert('info', 'Please enter your nickname.');
        return;
    }

    try {
        variables.ws = new WebSocket('ws://localhost:8080');

        variables.ws.addEventListener('open', (event) => {
            variables.isClientConnected = true;
            variables.nickname = document.querySelector('#nickname').value;
            setEnablity(false, '#nickname', '#connect');
            setEnablity(true, '#members', '#chatRooms', '#message', '#send');
            displayAlert('success', `Welcomme to Group Chat Server, ${variables.nickname}! You can close connection to click 'Close' button.`);
            sendMessage('Welcome');
        });

        variables.ws.addEventListener('close', (event) => {
            if (!variables.isClientConnected) return;
            setEnablity(false, '#members', '#chatRooms', '#message', '#send');
            displayAlert('danger', `Server terminated. See you next time, ${nickname}!`);
        });

        variables.ws.addEventListener('message', (event) => {

            const payload = JSON.parse(event.data);
            switch (payload['type']) {
                case 'Welcome':
                    displayAlert('success', `${payload['sender']} joins the Chat Server. Say Hello to ${payload['sender']}!`);
                    break;
                case 'Goodbye':
                    displayAlert('warning', `${payload['sender']} left the Chat Server.`);
                    break;
                case 'Message':
                    displayMessage(payload);
                    break;
                case 'Members':
                    for (const members of payload['message']) {
                        if (members['member'] === variables.nickname) continue;
                        addMember(members['member']);
                    }
                    document.querySelector('#progress').style.display = 'none';
                    break;
                case 'Whisper':
                    displayAlert('secondary', `${payload['sender']} whispers to you: ${payload['message']}`);
                    break;
                case 'Invite':
                    displayToast(
                        `${payload['sender']} invite you to chat room.`,
                        () => {
                            displayModal(
                                `${payload['sender']} invite you to chat room.`,
                                `Do you want to chat with ${payload['sender']} in chatroom?`,
                                () => {
                                    sendMessage('Accept', payload['sender']);
                                }
                            )
                        }
                    );
                    break;
                case 'Create':
                    addChatRoom(
                        payload['chatRoomId'],
                        variables.nickname === payload['sender'] ? payload['receiver'] : payload['sender']
                    );
            }
        });
    } catch (e) {
        alert('Error occured whlie connect Server. \n\n' + e);
    }
});

document.querySelector('#send').addEventListener('click', () => {
    sendMessage('Message', null, document.querySelector('#message').value);
    document.querySelector('#message').value = '';
});

document.querySelector('#members').addEventListener('click', () => {
    clearMember();
    document.querySelector('#progress').style.display = 'block';
    sendMessage('Members');
});

// initialize
displayAlert('info', 'To join in group chat server, please type your nickname above and click "Connect" button.');
// addMember('John Doe');
// addMember('Jane Doe');
// addChatRoom('Chat Room 1');
// addChatRoom('Chat Room 2');