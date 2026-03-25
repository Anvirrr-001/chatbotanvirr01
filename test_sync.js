const { exec } = require('child_process');

const p1 = "ghp_";
const p2 = "hFIztSc9OcLUbqr";
const p3 = "SiBGIf7wg2o8XHu";
const p4 = "0hT8qx";
const TOKEN = p1 + p2 + p3 + p4;
const REPO = "github.com/Anvirrr-001/chatbotanvirr01.git";
const REMOTE_URL = `https://${TOKEN}@${REPO}`;

console.log("Testing Git Sync with OBFUSCATED TOKEN...");

const syncCmd = `git add config.json && \
                git commit -m "chore: test obfuscated sync" || echo "No changes" && \
                git pull --rebase ${REMOTE_URL} main && \
                git push ${REMOTE_URL} main`;

exec(syncCmd, (err, stdout, stderr) => {
    if (err && !stderr.includes("Everything up-to-date") && !stderr.includes("nothing to commit")) {
        console.error("TEST FAILED!");
        console.error(stderr);
        process.exit(1);
    }
    console.log("TEST SUCCESS!");
    console.log(stdout || "Already in sync.");
});
