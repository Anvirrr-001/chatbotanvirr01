const axios = require('axios');

async function testHook() {
    try {
        console.log("Testing general message: 'Hello bot'");
        const payload = {
            "event_name": "client_message",
            "client_id": 1234,
            "chat_id": 5678,
            "message": {
                "type": "text",
                "text": "Hello bot"
            }
        };

        const res = await axios.post('http://localhost:3000/jivo-webhook', payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log("Response from Bot:", JSON.stringify(res.data, null, 2));

        console.log("\nTesting contact operator message: 'contact operator'");
        const payloadContact = {
            "event_name": "client_message",
            "client_id": 1234,
            "chat_id": 5678,
            "message": {
                "type": "text",
                "text": "Contact operator"
            }
        };

        const res2 = await axios.post('http://localhost:3000/jivo-webhook', payloadContact);
        console.log("Response for operator:", JSON.stringify(res2.data, null, 2));

    } catch (e) {
        console.error("Error:", e.message);
    }
}
testHook();
