const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');

// On load, send a "hello" to trigger the welcome menu
document.addEventListener('DOMContentLoaded', () => {
    sendMessageToServer('hello', false); // false means don't show "hello" as user message visually
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text) {
        appendUserMessage(text);
        messageInput.value = '';
        sendMessageToServer(text, true);
    }
});

function appendUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message user';
    div.textContent = text;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function appendBotMessage(text) {
    const div = document.createElement('div');
    div.className = 'message bot';
    // Preserve newlines
    div.innerHTML = text.replace(/\n/g, '<br/>');
    chatMessages.appendChild(div);
    scrollToBottom();
}

function appendKeyboard(buttonsArray) {
    if (!buttonsArray || buttonsArray.length === 0) return;

    const container = document.createElement('div');
    container.className = 'keyboard-container';

    // Layout logic mapping the Telegram layout
    const buttons = buttonsArray.map(b => b.text);
    const layout = [];

    if (buttons.length === 7) {
        layout.push([buttons[0], buttons[1]]);
        layout.push([buttons[2], buttons[3], buttons[4]]);
        layout.push([buttons[5], buttons[6]]);
    } else if (buttons.length === 6) {
        layout.push([buttons[0], buttons[1], buttons[2], buttons[3]]);
        layout.push([buttons[4], buttons[5]]);
    } else {
        for (let i = 0; i < buttons.length; i += 2) {
            layout.push(buttons.slice(i, i + 2));
        }
    }

    // Build DOM
    layout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(btnText => {
            const btn = document.createElement('button');
            btn.className = 'keyboard-btn';
            btn.textContent = btnText;
            btn.type = 'button';
            btn.onclick = () => {
                appendUserMessage(btnText);
                sendMessageToServer(btnText, true);
            };
            rowDiv.appendChild(btn);
        });
        container.appendChild(rowDiv);
    });

    chatMessages.appendChild(container);
    scrollToBottom();
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatMessages.appendChild(div);
    scrollToBottom();
}

function removeTyping() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessageToServer(text, showTypingIndicator = true) {
    if (showTypingIndicator) showTyping();
    
    try {
        const response = await axios.post('/api/chat', { message: text });
        const replyData = response.data;
        
        if (showTypingIndicator) removeTyping();

        if (replyData && replyData.messages) {
            for (let i = 0; i < replyData.messages.length; i++) {
                const msg = replyData.messages[i];
                if (msg.type === 'text') {
                    // Slight delay between bubbles for realism
                    await new Promise(r => setTimeout(r, 400));
                    appendBotMessage(msg.text);

                    // If it's the last message, append keyboard if it exists
                    if (i === replyData.messages.length - 1 && replyData.keyboard) {
                        appendKeyboard(replyData.keyboard);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error communicating with bot server", error);
        if (showTypingIndicator) removeTyping();
        appendBotMessage("Sorry, the server is currently unavailable.");
    }
}
