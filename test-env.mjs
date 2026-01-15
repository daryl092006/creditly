
async function test() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    console.log("Testing URL:", url);
    if (!url) {
        console.error("URL is missing!");
        return;
    }
    try {
        const res = await fetch(url);
        console.log("Fetch status:", res.status);
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}
test();
