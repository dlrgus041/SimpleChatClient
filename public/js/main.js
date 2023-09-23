import { manager, chatRoomMap, sendMessage, setFocused } from './background.js';

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

const progressbar = document.querySelector('#progress');

// functions
function displayAlert(type, message) {
    const node = alertForm.cloneNode(true);
    node.style.display = 'block';
    node.classList.add(`alert-${type}`);
    node.innerHTML = message;
    groupChatArea.appendChild(node);
};

function displayMessage(data) {
    
    const isMine = (data.payload.sender === data.name);
    const node = groupChatForm.cloneNode(true);
    
    node.style.display = 'block';
    node.style.textAlign = isMine ? 'right' : 'left';

    node.children[0].classList.add(isMine ? 'mine' : 'other');
    node.children[0].innerHTML = (isMine? '' : (data.payload.sender + ': ')) + data.payload.message;

    groupChatArea.appendChild(node);
};

function setEnablity(enablity, ...ids) {
    for (const id of ids) {
        document.querySelector(id).disabled = !enablity;
    }
}

function addMember(memberName) {

    const node = memberForm.cloneNode(true);
    node.style.display = 'block';
    node.children[0].children[0].children[0].innerHTML = memberName;

    node.children[0].children[1].children[0].addEventListener('click', () => {
        displayModal(
            `Invite ${memberName}`,
            `New chatroom will be made and invite ${memberName}. Continue?`,
            () => {
                sendMessage('Invite', memberName);
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
            }
        );
    });

    memberArea.appendChild(node);
}

function clearMember() {
    memberArea.textContent = '';
}

function addChatRoom(chatRoomId) {

    const node = chatRoomForm.cloneNode(true);
    node.style.display = 'block';
    chatRoomMap.set(chatRoomId, `ChatRoom ${chatRoomId}`);

    node.addEventListener('click', () => {
        setFocused(chatRoomId);
        enterChatRoom('/chatroom', {
            id: chatRoomId,
            name: chatRoomMap.get(chatRoomId) 
        });
    });

    node.children[0].children[0].children[0].innerHTML = chatRoomMap.get(chatRoomId);
    node.children[0].children[1].children[0].addEventListener('click', () => {
        sendMessage('Members', null, null, chatRoomId);
    });
    node.children[0].children[1].children[1].addEventListener('click', () => {
        displayModal(
            'Warning',
            `All messages in ${chatRoomMap.get(chatRoomId)} will be deleted. Are you sure?`,
            () => {
                sendMessage('Leave', null, null, chatRoomId);
            }
        )
    });

    chatRoomArea.appendChild(node);
}

function removeChatRoom(chatRoomId) {
    chatRoomMap.get(chatRoomId).remove();
    chatRoomMap.delete(chatRoomId);
}

function displayModal(title, body, callback, singleBtn = false) {
    modalForm.children[0].children[0].children[0].children[0].innerHTML = title;
    modalForm.children[0].children[0].children[1].innerHTML = body;
    modalForm.children[0].children[0].children[2].children[0].addEventListener('click', callback, {once: true});
    modalForm.children[0].children[0].children[2].children[1].style.display = singleBtn ? 'none' : 'block';
    new bootstrap.Modal(modalForm).show();
}

function displayToast(body, callback = null) {
    
    const node = toastForm.cloneNode(true);
    if (callback !== null) {
        node.addEventListener('click', callback);
        node.style.curser = pointer;
    }

    node.children[0].children[0].innerHTML = body;
    toastArea.appendChild(node);
    bootstrap.Toast.getOrCreateInstance(node).show();
}

// using 'form' tag to send POST message
function enterChatRoom(url, params) {

    var form = document.createElement('form');
    form.setAttribute('method', 'post');
    form.setAttribute('target', '_blank');
    form.setAttribute('action', url);

    for (var key in params) {
      var hiddenField = document.createElement('input');
      hiddenField.setAttribute('type', 'hidden');
      hiddenField.setAttribute('name', key);
      hiddenField.setAttribute('value', params[key]);
      form.appendChild(hiddenField);
    }

    document.body.appendChild(form);
    form.submit();
}

// addEventListener
document.querySelector('#send').addEventListener('click', () => {
    sendMessage('Message', null, document.querySelector('#message').value);
    document.querySelector('#message').value = '';
});

document.querySelector('#members').addEventListener('click', () => {
    clearMember();
    memberArea.appendChild(progressbar);
    progressbar.style.display = 'block';
    sendMessage('Members');
});

// document.addEventListener("visibilitychange", () => {
//     if (document.visibilityState == 'visible') {
//         focusedChatRoom = 0;
//     }
// });

// managers
manager.addEventListener('open', (e) => {
    sendMessage('Initial');
});

manager.addEventListener('close', (e) => {
    setEnablity(false, '#members', '#chatRooms', '#message', '#send');
    displayAlert('danger', `Server terminated. See you next time, ${e.detail.name}!`);
});

manager.addEventListener('chat', (e) => {
    if (e.detail.payload.chatRoomId == 0) displayMessage(e.detail);
    else if (document.visibilityState === 'visible') displayToast(`New message arrived from ${chatRoomMap.get(e.detail.payload.chatRoomId)}.`);
});

manager.addEventListener('action', (e) => {
    switch (e.detail.payload.type) {
        case 'Initial':
            setEnablity(true, '#members', '#chatRooms', '#message', '#send');
            sendMessage('Welcome');
            break;
        case 'Welcome':
            displayAlert(
                'success', 
                e.detail.payload.sender === e.detail.name
                ? `Welcomme to Group Chat Server, ${e.detail.name}!`
                : `${e.detail.payload.sender} joins the Chat Server. Say Hello to ${e.detail.payload.sender}!`
            );
            break;
        case 'Goodbye':
            displayAlert('warning', `${e.detail.payload.sender} left the Chat Server.`);
            break;
        case 'Members':
            for (const members of e.detail.payload.message) {
                if (members.member === e.detail.name) continue;
                addMember(members.member);
            }
            progressbar.style.display = 'none';
            break;
        case 'Whisper':
            if (e.detail.payload.sender === e.detail.name) {
                displayToast(`Succefully whispered to ${e.detail.payload.sender}.`);
                displayAlert('secondary', `Whispers to ${e.detail.payload.sender}: ${e.detail.payload.message}`);
            } else {
                displayToast(`${e.detail.payload.sender} whisper to you.`);
                displayAlert('secondary', `${e.detail.payload.sender} whispers to you: ${e.detail.payload.message}`);
            }
            break;
        case 'Invite':
            addChatRoom(e.detail.payload.chatRoomId);
            displayToast(
                e.detail.payload.sender === e.detail.name
                ? `New chatroom with ${e.detail.payload.receiver} is created.`
                : `${e.detail.payload.receiver} invite you to new chatroom.`,
            );
            break;
        // case 'Create':
        //     addChatRoom(e.detail.payload.chatRoomId, e.detail.payload.sender);
        //     break;
    }
})

// initialize
displayModal(
    'Welcome to Group Chat Server',
    `<input id="nickname" class="form-control" placeholder="Please type your nickname here and click 'Confirm'.">`,
    () => {
        const nickname = document.querySelector('#nickname').value;
        manager.emit('connect', {name: nickname});
    }, true
);