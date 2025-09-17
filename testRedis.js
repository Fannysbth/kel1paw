import { createClient } from 'redis';

const client = createClient({
  socket: {
    host: 'redis-19135.c259.us-central1-2.gce.redns.redis-cloud.com',
    port: 19135,
    tls: true
  },
  username: 'default', // usually 'default'
  password: 't4JMyzyw52QOm1UFDzdS2R40XfaLR4hu'
});

client.on('error', (err) => console.error('Redis Error:', err));

await client.connect();

console.log('Connected to Redis Cloud!');

// Example usage
await client.set('test', 'Hello Redis Cloud!');
const value = await client.get('test');
console.log('Value from Redis:', value);

await client.quit();
