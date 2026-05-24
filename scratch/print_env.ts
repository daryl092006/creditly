console.log("--- ENVIRONMENT VARIABLES ---");
for (const key of Object.keys(process.env)) {
    if (key.includes("DB") || key.includes("POSTGRES") || key.includes("SQL") || key.includes("PASSWORD") || key.includes("URL") || key.includes("KEY")) {
        console.log(`${key}: ${process.env[key]?.slice(0, 15)}... [length: ${process.env[key]?.length}]`);
    }
}
