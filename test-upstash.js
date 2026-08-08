const Redis = require('ioredis');

async function testConnection() {
  const rawUrl = 'rediss://default:gQAAAAAAAkbnAAIgcDFkMjI3MDIwYWZhZGQ0YWQ2YWJjMzQ5MDY4NmVkNTVlMA@mighty-gannet-149991.upstash.io:6379';
  
  const client = new Redis(rawUrl, {
    tls: { rejectUnauthorized: false },
    connectTimeout: 5000,
    maxRetriesPerRequest: 1
  });

  client.on('error', (err) => {
    console.error('Connection failed:', err);
    process.exit(1);
  });

  try {
    const result = await client.ping();
    console.log('Ping successful:', result);
  } catch (err) {
    console.error('Ping failed:', err);
  } finally {
    client.quit();
  }
}

testConnection();
