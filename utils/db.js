import { MongoClient } from 'mongodb';

class DBClient {
  /**
   * Constructor initializes the connection to MongoDB using environment
   * variables for configuration.
   */
  constructor() {
    const host = process.env.DB_HOST || 'localhost'; // MongoDB host
    const port = process.env.DB_PORT || '27017'; // MongoDB port
    const database = process.env.DB_DATABASE || 'files_manager'; // MongoDB database name
    const url = `mongodb://${host}:${port}`; // Connection URL

    // Create a new MongoClient and connect to the database
    this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

    this.client.connect().then(() => {
      // Initialize collections after successful connection
      this.db = this.client.db(database);
      this.users = this.db.collection('users');
      this.files = this.db.collection('files');
    }).catch((err) => {
      console.error('Failed to connect to MongoDB', err);
    });
  }

  /**
   * Checks if the MongoDB client is connected and alive.
   * @returns {boolean} True if connected, false otherwise.
   */
  isAlive() {
    return this.client && this.client.topology && this.client.topology.isConnected();
  }

  /**
   * Gets the number of users in the 'users' collection.
   * @returns {Promise<number>} The number of users.
   */
  async nbUsers() {
    if (this.isAlive()) {
      const allUsers = await this.users.find({}).toArray();
      return allUsers.length;
    }
    return 0;
  }

  /**
   * Gets the number of files in the 'files' collection.
   * @returns {Promise<number>} The number of files.
   */
  async nbFiles() {
    if (this.isAlive()) {
      const allFiles = await this.files.find({}).toArray();
      return allFiles.length;
    }
    return 0;
  }

  /**
   * Retrieves all users from the 'users' collection.
   * @returns {Promise<Array>} An array of all users.
   */
  async allUsers() {
    if (this.isAlive()) {
      return await this.users.find({}).toArray();
    }
    return {};
  }

  /**
   * Finds a single user in the 'users' collection that matches the given parameters.
   * @param {Object} params - The parameters to match.
   * @returns {Promise<Object|null>} The matched user or null if no user is found.
   */
  async findOne(params) {
    if (this.isAlive()) {
      return await this.users.findOne(params);
    }

    return {};
  }

  /**
   * Inserts a new object into the 'users' collection.
   * @param {Object} params - The object to insert.
   * @returns {Promise<Object>} The result of the insertion.
   */
  async insertObject(params) {
    if (this.isAlive()) {
      return await this.users.insertOne(params);
    }

    return {};
  }
}

const dbClient = new DBClient();

export default dbClient;
