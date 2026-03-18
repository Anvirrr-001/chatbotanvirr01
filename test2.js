const { handleMessage } = require('./botLogic.js');
async function run() {
    try {
        const r1 = await handleMessage('ডিপোজিট তথ্য', 1, 1);
        console.log('RESULT1:', JSON.stringify(r1, null, 2));

        const r2 = await handleMessage('ডিপোজিট জমা হয় নি', 1, 1);
        console.log('RESULT2:', JSON.stringify(r2, null, 2));

        const r3 = await handleMessage('দীর্ঘ উত্তোলন', 1, 1);
        console.log('RESULT3:', JSON.stringify(r3, null, 2));
    } catch(e) {
        console.error('ERROR:', e);
    }
    process.exit(0);
}
run();
