const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static waitRedisConnection() {
    return new Promise((resolve, reject) => {
      let i = 0;
      const conn = () => {
        setTimeout(() => {
          i += 1;

          if (i >= 10) {
            reject();
          } else if (!redisClient.isAlive()) {
            conn();
          } else {
            resolve();
          }
        }, 1000);
      };

      conn();
    });
  }

  static waitdbConnection() {
    return new Promise((resolve, reject) => {
      let i = 0;
      const conn = () => {
        setTimeout(() => {
          i += 1;

          if (i >= 10) {
            reject();
          } else if (!dbClient.isAlive()) {
            conn();
          } else {
            resolve();
          }
        }, 1000);
      };

      conn();
    });
  }

  static async getStatus(req, res) {
    try {
      await this.waitRedisConnection();
      await this.waitdbConnection();

      const redisAlive = redisClient.isAlive();
      const dbAlive = dbClient.isAlive();

      res.status(200).send({ redis: redisAlive, db: dbAlive });
    } catch (err) {
      res.status(500).send({ error: `Failed to connect to Redis or Database ${err}` });
    }
  }

  static async getStats(req, res) {
    try {
      await this.waitRedisConnection();
      await this.waitdbConnection();

      const nbUsers = await dbClient.nbUsers();
      const nbFiles = await dbClient.nbFiles();

      res.status(200).send({ users: nbUsers, files: nbFiles });
    } catch (err) {
      res.status(500).send({ error: 'Failed to get stats from Redis or Database' });
    }
  }
}

module.exports = AppController;