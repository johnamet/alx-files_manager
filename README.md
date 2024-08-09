This project involves building a file management system with several key features using Node.js, Express, MongoDB,
Redis, and other related technologies. Here's a breakdown of the requirements and tasks to help you organize your work:

### **Project Overview**

**Objective:**

- Build a platform for uploading and managing files with features like user authentication, file listing, uploading,
  permission changes, and thumbnail generation.

**Features to Implement:**

1. **User Authentication:**
    - Token-based authentication for secure access.
    - Endpoints for user sign-in, sign-out, and profile retrieval.

2. **File Management:**
    - List all files.
    - Upload new files.
    - Change file permissions.
    - View specific files.
    - Generate thumbnails for image files.

### **Tasks Breakdown**

1. **Redis Utilities (utils/redis.js):**
    - Create a `RedisClient` class to manage Redis operations (connectivity, get/set/del operations).
    - Implement methods for checking connection status, and CRUD operations with expiration support.

2. **MongoDB Utilities (utils/db.js):**
    - Create a `DBClient` class for MongoDB interactions.
    - Implement methods to check connectivity and retrieve counts for users and files.

3. **API Creation (server.js, routes/index.js, controllers/AppController.js):**
    - Set up an Express server.
    - Define routes and link them to appropriate controller methods.
    - Implement endpoints for application status and stats retrieval.

4. **User Management (controllers/UsersController.js):**
    - Implement user creation endpoint with email and password validation.
    - Handle missing or duplicate fields, hash passwords, and store user details.

5. **User Authentication (controllers/AuthController.js):**
    - Implement sign-in and sign-out functionality with token generation and validation.
    - Implement endpoint to retrieve user details based on token.

6. **File Management (controllers/FilesController.js):**
    - Implement file upload functionality including handling file types and storage paths.
    - Implement endpoints for listing files and retrieving specific file details.
    - Handle file permissions and data storage.

### **Development Setup**

**Dependencies:**

- Node.js, Express, MongoDB, Redis, Bull, image-thumbnail, mime-types, and UUID for various functionalities.

**Development Tools:**

- Use ESLint for code linting.
- Use Mocha for testing.
- Use Nodemon for development server and worker restarts.

### **Implementation Tips**

1. **Code Organization:**
    - Separate concerns into different files (controllers, utils, routes).
    - Use a `utils` folder for reusable functions and classes (e.g., RedisClient, DBClient).

2. **Testing:**
    - Test endpoints using tools like `curl` or Postman.
    - Implement unit tests for critical components using Mocha and Chai.



FileController.js
```
import chai from 'chai';
import chaiHttp from 'chai-http';

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

import { MongoClient, ObjectID } from 'mongodb';
import { promisify } from 'util';
import redis from 'redis';
import sha1 from 'sha1';

chai.use(chaiHttp);

describe('GET /files/:id/data', () => {
    let testClientDb;
    let testRedisClient;
    let redisDelAsync;
    let redisGetAsync;
    let redisSetAsync;
    let redisKeysAsync;

    let initialUser = null;
    let initialUserId = null;
    let initialUserToken = null;

    let initialUnpublishedFolderId = null;
    let initialPublishedFolderId = null;

    const folderTmpFilesManagerPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    const fctRandomString = () => {
        return Math.random().toString(36).substring(2, 15);
    }
    const fctRemoveAllRedisKeys = async () => {
        const keys = await redisKeysAsync('auth_*');
        keys.forEach(async (key) => {
            await redisDelAsync(key);
        });
    }
    const fctRemoveTmp = () => {
        if (fs.existsSync(folderTmpFilesManagerPath)) {
            fs.readdirSync(`${folderTmpFilesManagerPath}/`).forEach((i) => {
                fs.unlinkSync(`${folderTmpFilesManagerPath}/${i}`)
            })
        }
    }

    beforeEach(() => {
        const dbInfo = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '27017',
            database: process.env.DB_DATABASE || 'files_manager'
        };
        return new Promise((resolve) => {
            fctRemoveTmp();
            MongoClient.connect(`mongodb://${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`, async (err, client) => {
                testClientDb = client.db(dbInfo.database);

                await testClientDb.collection('users').deleteMany({})
                await testClientDb.collection('files').deleteMany({})

                // Add 1 user
                initialUser = {
                    email: `${fctRandomString()}@me.com`,
                    password: sha1(fctRandomString())
                }
                const createdDocs = await testClientDb.collection('users').insertOne(initialUser);
                if (createdDocs && createdDocs.ops.length > 0) {
                    initialUserId = createdDocs.ops[0]._id.toString();
                }

                // Add 1 folder unpublished
                const initialUnpublishedFolder = {
                    userId: ObjectID(initialUserId),
                    name: fctRandomString(),
                    type: "folder",
                    parentId: '0',
                    isPublic: false
                };
                const createdUFolderDocs = await testClientDb.collection('files').insertOne(initialUnpublishedFolder);
                if (createdUFolderDocs && createdUFolderDocs.ops.length > 0) {
                    initialUnpublishedFolderId = createdUFolderDocs.ops[0]._id.toString();
                }

                // Add 1 folder published
                const initialPublishedFolder = {
                    userId: ObjectID(initialUserId),
                    name: fctRandomString(),
                    type: "folder",
                    parentId: '0',
                    isPublic: true
                };
                const createdPFolderDocs = await testClientDb.collection('files').insertOne(initialPublishedFolder);
                if (createdPFolderDocs && createdPFolderDocs.ops.length > 0) {
                    initialPublishedFolderId = createdPFolderDocs.ops[0]._id.toString();
                }

                testRedisClient = redis.createClient();
                redisDelAsync = promisify(testRedisClient.del).bind(testRedisClient);
                redisGetAsync = promisify(testRedisClient.get).bind(testRedisClient);
                redisSetAsync = promisify(testRedisClient.set).bind(testRedisClient);
                redisKeysAsync = promisify(testRedisClient.keys).bind(testRedisClient);
                testRedisClient.on('connect', async () => {
                    fctRemoveAllRedisKeys();

                    // Set token for this user
                    initialUserToken = uuidv4()
                    await redisSetAsync(`auth_${initialUserToken}`, initialUserId)
                    resolve();
                });
            });
        });
    });

    afterEach(() => {
        fctRemoveAllRedisKeys();
        fctRemoveTmp();
    });

    it('GET /files/:id/data with an unpublished folder linked to :id and user authenticated and owner', (done) => {
        chai.request('http://localhost:5000')
            .get(`/files/${initialUnpublishedFolderId}/data`)
            .set('X-Token', initialUserToken)
            .end(async (err, res) => {
                chai.expect(err).to.be.null;
                chai.expect(res).to.have.status(400);

                const resError = res.body.error;
                chai.expect(resError).to.equal("A folder doesn't have content");

                done();
            });
    }).timeout(30000);

    it('GET /files/:id/data with a published folder linked to :id and user authenticated and owner', (done) => {
        chai.request('http://localhost:5000')
            .get(`/files/${initialPublishedFolderId}/data`)
            .set('X-Token', initialUserToken)
            .end(async (err, res) => {
                chai.expect(err).to.be.null;
                chai.expect(res).to.have.status(400);

                const resError = res.body.error;
                chai.expect(resError).to.equal("A folder doesn't have content");

                done();
            });
    }).timeout(30000);
});
```


worker.js
```
import Queue from 'bull';
import sha1 from 'sha1';
import fs from 'fs';
import path from 'path';
import { v4 as uuidV4 } from 'uuid';
import { ObjectId } from 'mongodb';
import redisClient from './utils/redis';
import dbClient from './utils/db';

// Initialize userQueue
const userQueue = new Queue('userQueue', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  },
});

// Initialize fileQueue
const fileQueue = new Queue('fileQueue', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  },
});

// Process file uploads
fileQueue.process('uploadFile', async (job, done) => {
  const fileData = job.data;

  try {
    const {
      type, data,
    } = fileData;

    if (type === 'folder') {
      const newFile = await dbClient.insertFileObject(fileData);
      newFile.parentId = newFile._id
      done(null, newFile.ops[0]);
      return;
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const localPath = path.join(folderPath, uuidV4());

    fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

    fileData.localPath = localPath;

    const savedFile = await dbClient.insertFileObject(fileData);

    const newFile = savedFile.ops[0];

    done(null, newFile);
  } catch (error) {
    done(error);
  }
});

// Process user creation
userQueue.process('createUser', async (job, done) => {
  const { email, password } = job.data;
  const hashedPassword = sha1(password);

  try {
    const result = await dbClient.insertUserObject({ email, password: hashedPassword });
    done(null, result.insertedId);
  } catch (error) {
    done(error);
  }
});

// Process user sign-in
userQueue.process('signInUser', async (job, done) => {
  const { emailSignIn, passwordSignIn } = job.data;
  const hashedPasswordSignIn = sha1(passwordSignIn.trim());

  try {
    const user = await dbClient.findOneUser({ email: emailSignIn, password: hashedPasswordSignIn });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Process user sign-out
userQueue.process('signOutUser', async (job, done) => {
  const { token } = job.data;
  const key = `auth_${token}`;

  try {
    await redisClient.del(key);
    done();
  } catch (error) {
    done(error);
  }
});

userQueue.process('sendWelcomeEmail', async (job, done) => {
  const { userId, email } = job.data;

  if (!userId) {
    return done(new Error('Missing userId'));
  }

  if (!email) {
    return done(new Error('Missing email'));
  }

  try {
    const user = await dbClient.findOneUser({ _id: new ObjectId(userId) });

    if (!user) {
      return done(new Error('User not found'));
    }

    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    return error;
  }

  return null;
});

export default userQueue;
export { fileQueue };
```
