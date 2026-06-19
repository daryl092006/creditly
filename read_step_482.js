const fs = require('fs');
const readline = require('readline');

async function run() {
    const fileStream = fs.createReadStream('C:\\\\Users\\\\HP-Pro\\\\.gemini\\\\antigravity-ide\\\\brain\\\\20e975cc-585a-4a1c-9978-b4c1e96edd3b\\\\.system_generated\\\\logs\\\\transcript.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        const parsed = JSON.parse(line);
        if (parsed.step_index === 482) {
            console.log("=== Step 482 ===");
            console.log(JSON.stringify(parsed, null, 2));
            break;
        }
    }
}

run();
