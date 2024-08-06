const { createClient } = require("redis");

class RedisClient {
  constructor() {
    this.client = null;
    this.initParams();
  }

  async initParams() {
    this.client = createClient();

    this.client.on("error", (err) => console.log('Redis Client Error:', err));

    await this.client.connect();
  }

  isAlive() {
    return this.client && this.client.isOpen;
  }

  async get(key) {
    if (this.isAlive()) {
      const value = await this.client.get(key);
      return value;
    } else {
      console.log('Redis client is not connected');
    }
  }

  async set(key, value, exp) {
    if (this.isAlive()) {
      await this.client.set(key, value, { EX: exp });
    } else {
      console.log('Redis client is not connected');
    }
  }

  async del(key) {
    if (this.isAlive()) {
      await this.client.del(key);
    } else {
      console.log('Redis client is not connected');
    }
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
