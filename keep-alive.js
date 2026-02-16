// Keep-alive script to prevent Railway cold starts
// Pings the server every 5 minutes

const API_URL = 'https://jobtrackr-production-029f.up.railway.app/health';
const INTERVAL = 5 * 60 * 1000; // 5 minutes

async function ping() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] Ping successful:`, data);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Ping failed:`, error.message);
  }
}

// Ping immediately on start
ping();

// Then ping every 5 minutes
setInterval(ping, INTERVAL);

console.log(`Keep-alive started. Pinging ${API_URL} every 5 minutes.`);
