const fs = require('fs');

const envPath = 'c:\\Users\\HP\\Documents\\chatbot1\\.env';
let envContent = fs.readFileSync(envPath, 'utf8');

if (!envContent.includes('TELEGRAM_BOT_TOKEN')) {
    envContent += '\nTELEGRAM_BOT_TOKEN=8115201322:AAEV_YDJtphWvw2L7-gi5LUXUbk8YJnoZqA\n';
    fs.writeFileSync(envPath, envContent);
}
