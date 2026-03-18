const { OpenAI } = require('openai');

const useOpenAI = process.env.USE_OPENAI === 'true';

let openaiClient = null;
if (useOpenAI && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

/**
 * Handle incoming message from client
 * @param {string} messageText 
 * @param {string|number} clientId 
 * @param {string|number} chatId 
 * @returns {object} JivoChat formatted response JSON
 */
async function handleMessage(messageText, clientId, chatId) {
    const textLower = messageText.toLowerCase();

    // 1. Check for Contact Operator command first
    if (textLower.includes('contact operator') || textLower.includes('লাইভ এজেন্ট') || textLower.includes('talk to human')) {
        return {
            "event": "bot_message",
            "messages": [
                {
                    "type": "text",
                    "text": "Transferring you to a live operator now. Please wait..."
                }
            ]
        };
    }

    // 2. Welcome Menu (if user says hello, hi, start, or any generic initial greeting)
    if (textLower === '/start' || textLower.includes('hello') || textLower.includes('hi') || textLower === 'menu') {
        return createMenuResponse(
            "হ্যালো, কাস্টমার সাপোর্ট এ যোগাযোগ করার জন্য ধন্যবাদ 👋",
            "আপনার প্রশ্নের টপিক সিলেক্ট করুন।",
            [
                "বিকল্প জমা পদ্ধতি (bKash P2P) ব্যবহারের",
                "🎥 রেফারেল প্রোগ্রাম",
                "👑 ভিআইপি ক্লাব",
                "🎁 বোনাসগুলো",
                "💰 পেমেন্ট",
                "👤 এখন আপনি সরাসরি টেলিগ্রামে ELONBET",
                "👨‍💻 Contact Operator"
            ]
        );
    }

    // 3. Custom Keyword Rules (Temporary placeholders to be updated later)
    if (textLower.includes('price')) {
        return createBotResponse("Our pricing starts at $10. Please visit our pricing page for more details.");
    }

    // 4. Fallback to OpenAI if enabled
    if (useOpenAI && openaiClient) {
        try {
            const chatCompletion = await openaiClient.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful customer support bot. If you don't know the answer, tell them they can type 'Contact Operator' to talk to a human." },
                    { role: "user", content: messageText }
                ]
            });
            const aiResponseText = chatCompletion.choices[0].message.content;
            return createBotResponse(aiResponseText);
        } catch (error) {
            console.error("OpenAI Error:", error);
        }
    }

    // 5. Default Response if no keywords match and OpenAI is disabled/fails
    return createMenuResponse(
        "হ্যালো, কাস্টমার সাপোর্ট এ যোগাযোগ করার জন্য ধন্যবাদ 👋",
        "আপনার প্রশ্নের টপিক সিলেক্ট করুন।",
        [
            "বিকল্প জমা পদ্ধতি (bKash P2P) ব্যবহারের",
            "🎥 রেফারেল প্রোগ্রাম",
            "👑 ভিআইপি ক্লাব",
            "🎁 বোনাসগুলো",
            "💰 পেমেন্ট",
            "👤 এখন আপনি সরাসরি টেলিগ্রামে ELONBET",
            "👨‍💻 Contact Operator"
        ]
    );
}

/**
 * Helper to build standard JivoChat response JSON
 */
function createBotResponse(text) {
    return {
        "messages": [
            {
                "type": "text",
                "text": text
            }
        ]
    };
}

/**
 * Helper to build JivoChat response JSON with keyboard buttons
 */
function createMenuResponse(greeting, menuText, buttonsArray) {
    return {
        "messages": [
            {
                "type": "text",
                "text": greeting
            },
            {
                "type": "text",
                "text": menuText
            }
        ],
        "keyboard": buttonsArray.map(btnText => ({ "text": btnText }))
    };
}

module.exports = {
    handleMessage
};
