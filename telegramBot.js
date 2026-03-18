require('dotenv').config();
const { Telegraf } = require('telegraf');
const { handleMessage } = require('./botLogic');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not provided, Telegram bot will not start.");
} else {
    const bot = new Telegraf(token);

    bot.on('text', async (ctx) => {
        try {
            const userMessage = ctx.message.text;
            const clientId = ctx.from.id;
            const chatId = ctx.chat.id;

            // Get bot's reply from our logic engine
            const replyData = await handleMessage(userMessage, clientId, chatId);
            
            // JivoChat response format expects { messages: [{ type: "text", text: "..." }], keyboard: [{text: "..."}] }
            if (replyData && replyData.messages && replyData.messages.length > 0) {
                let extraOptions = {};
                if (replyData.keyboard && replyData.keyboard.length > 0) {
                    const buttons = replyData.keyboard.map(k => k.text);
                    const keyboardLayout = [];
                    
                    const getCbData = (text) => {
                        let data = text;
                        if (Buffer.byteLength(data, 'utf8') > 64) {
                            data = text.substring(0, 18);
                        }
                        return data;
                    };

                    // Specific layout matching the screenshot
                    // Row 1: 2 buttons
                    // Row 2: 3 buttons
                    // Row 3: 2 buttons
                    if (buttons.length === 7) {
                        keyboardLayout.push([
                            { text: buttons[0], callback_data: getCbData(buttons[0]) },
                            { text: buttons[1], callback_data: getCbData(buttons[1]) }
                        ]);
                        keyboardLayout.push([
                            { text: buttons[2], callback_data: getCbData(buttons[2]) },
                            { text: buttons[3], callback_data: getCbData(buttons[3]) },
                            { text: buttons[4], callback_data: getCbData(buttons[4]) }
                        ]);
                        keyboardLayout.push([
                            { text: buttons[5], callback_data: getCbData(buttons[5]) },
                            { text: buttons[6], callback_data: getCbData(buttons[6]) }
                        ]);
                    } else {
                        // Fallback generic layout (2 per row)
                        for(let i=0; i<buttons.length; i+=2) {
                            const row = buttons.slice(i, i+2).map(btn => ({ text: btn, callback_data: getCbData(btn) }));
                            keyboardLayout.push(row);
                        }
                    }
                    
                    extraOptions = {
                        reply_markup: {
                            inline_keyboard: keyboardLayout
                        }
                    };
                }

                for (let i = 0; i < replyData.messages.length; i++) {
                    const msg = replyData.messages[i];
                    if (msg.type === 'text') {
                        // Attach keyboard only to the very last message bubble
                        if (i === replyData.messages.length - 1) {
                            await ctx.reply(msg.text, extraOptions);
                        } else {
                            await ctx.reply(msg.text);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Telegram bot error:", e);
        }
    });

    // Handle button clicks (Inline Keyboard)
    bot.on('callback_query', async (ctx) => {
        try {
            const userMessage = ctx.callbackQuery.data;
            const clientId = ctx.from.id;
            const chatId = ctx.chat?.id || ctx.from.id;

            // Important: Acknowledge the button click so the loading icon disappears
            await ctx.answerCbQuery();

            // First, reply back a confirmation of their selection directly in the chat to match standard Jivo Chat UX
            await ctx.reply(userMessage);

            // Run the same logic as if they typed the text
            const replyData = await handleMessage(userMessage, clientId, chatId);
            
            if (replyData && replyData.messages && replyData.messages.length > 0) {
                let extraOptions = {};
                if (replyData.keyboard && replyData.keyboard.length > 0) {
                    const buttons = replyData.keyboard.map(k => k.text);
                    const keyboardLayout = [];
                    const getCbData = (text) => {
                        let data = text;
                        if (Buffer.byteLength(data, 'utf8') > 64) {
                            data = text.substring(0, 18);
                        }
                        return data;
                    };
                    for(let i=0; i<buttons.length; i++) {
                        keyboardLayout.push([{ text: buttons[i], callback_data: getCbData(buttons[i]) }]);
                    }
                    extraOptions = {
                        reply_markup: {
                            inline_keyboard: keyboardLayout
                        }
                    };
                }

                for (let i = 0; i < replyData.messages.length; i++) {
                    const msg = replyData.messages[i];
                    if (msg.type === 'text') {
                        // Attach keyboard only to the very last message bubble
                        if (i === replyData.messages.length - 1) {
                            await ctx.reply(msg.text, extraOptions);
                        } else {
                            await ctx.reply(msg.text);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Telegram callback query error:", e);
        }
    });

    bot.launch().then(() => {
        console.log("Telegram testing bot started successfully!");
    }).catch(err => {
        console.error("Failed to start Telegram bot:", err);
    });

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    module.exports = bot;
}
