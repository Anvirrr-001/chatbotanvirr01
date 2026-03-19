const fs = require('fs');
const path = require('path');

// In-Memory Session Storage
const userSessions = new Map();

/**
 * Handle incoming message from client
 */
async function handleMessage(messageText, clientId, chatId) {
    const textLower = messageText.toLowerCase().trim();

    // Load Config
    let config = { menus: [], initialMenuId: "main_menu", keywords: [] };
    try {
        const configPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) { console.error("Config Error:", e); }

    let session = userSessions.get(chatId) || { menuId: config.initialMenuId };

    // 1. Check for Global keywords first (e.g. "ইতিমধ্যে একটি অনুরোধ জমা দিয়েছি")
    if (config.keywords) {
        for (const kw of config.keywords) {
            const trigger = kw.trigger.toLowerCase().trim();
            if (textLower.includes(trigger)) {
                userSessions.delete(chatId);
                if (kw.responseType === 'operator') return createOperatorResponse(kw.text);
                return createBotResponse(kw.text);
            }
        }
    }

    // 2. Check if user typed an option from the CURRENT menu
    const currentMenu = config.menus.find(m => m.id === (session.menuId || config.initialMenuId));
    if (currentMenu && currentMenu.options) {
        const option = currentMenu.options.find(opt => opt.text.toLowerCase() === textLower);
        if (option) {
            session.menuId = option.target;
            userSessions.set(chatId, session);
            return renderMenu(session.menuId, config);
        }
    }

    // 3. Reset logic (Start / Hello / Menu)
    if (textLower === '/start' || textLower === 'hello' || textLower === 'hi' || textLower === 'menu' || textLower === 'শুরু') {
        session.menuId = config.initialMenuId;
        userSessions.set(chatId, session);
        return renderMenu(session.menuId, config);
    }

    // 4. Fallback: Re-render current menu or show initial
    return renderMenu(session.menuId || config.initialMenuId, config);
}

/**
 * Render a menu based on its ID
 */
function renderMenu(menuId, config) {
    const menu = config.menus.find(m => m.id === menuId);
    if (!menu) return renderMenu(config.initialMenuId, config); // Fallback to start

    // If it's an operator type menu
    if (menu.type === 'operator') {
        return createOperatorResponse(menu.text || "ট্রান্সফার করা হচ্ছে...");
    }

    // Standard menu response
    const messages = [];
    if (menuId === config.initialMenuId && config.welcomeGreeting) {
        messages.push({ "type": "text", "text": config.welcomeGreeting });
    }
    messages.push({ "type": "text", "text": menu.text });

    const response = {
        "messages": messages
    };

    if (menu.options && menu.options.length > 0) {
        response.keyboard = menu.options.map(opt => ({ "text": opt.text }));
    }

    return response;
}

function createBotResponse(text) {
    return { "messages": [{ "type": "text", "text": text }] };
}

function createOperatorResponse(text) {
    return {
        "event": "bot_message",
        "messages": [{ "type": "text", "text": text || "আমি আপনার চ্যাট টি অপারেটর এর কাছে ট্রান্সফার করতেছি।" }]
    };
}

module.exports = { handleMessage };


