import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

    this.client.connect().then(() => {
      this.db = this.client.db(database);
      this.users = this.db.collection('users');
      this.files = this.db.collection('files');
    }).catch((err) => {
      console.error('Failed to connect to MongoDB', err);
    });
  }

  isAlive() {
    return this.client && this.client.topology && this.client.topology.isConnected();
  }

  async nbUsers() {
    if (this.isAlive()) {
      const allUsers = await this.users.find({}).toArray();
      return allUsers.length;
    }
    return 0;
  }

  async nbFiles() {
    if (this.isAlive()) {
      const allFiles = await this.files.find({}).toArray();
      return allFiles.length;
    }
    return 0;
  }

  async allUsers() {
    if (this.isAlive()){
      return await this.users.find({}).toArray()
    }
  }

  async findUser(params) {
    if (this.isAlive()){
      return await this.users.find(params).toArray();
    }
  }

  async insertObject(params){
    if (this.isAlive()){
      return await this.users.insertOne(params);
    }
  }
}

const dbClient = new DBClient();

export default dbClient;
