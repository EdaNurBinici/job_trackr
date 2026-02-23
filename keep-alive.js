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
ping();
setInterval(ping, INTERVAL);
console.log(`Keep-alive started. Pinging ${API_URL} every 5 minutes.`);
