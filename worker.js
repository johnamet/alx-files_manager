import Queue from 'bull';
import sha1 from 'sha1';
import dbClient from './utils/db'; // Ensure this path is correct
import redisClient from './utils/redis';
import fs from 'fs';
import path from 'path';
import { v4 as uuidV4 } from 'uuid';

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

fileQueue.process('generateThumbnails', async (job, done) => {
    const { userId, fileId } = job.data;
  
    if (!fileId) {
      return done(new Error('Missing fileId'));
    }
  
    if (!userId) {
      return done(new Error('Missing userId'));
    }
  
    const file = await dbClient.findOneFile({ _id: new ObjectId(fileId), userId });
  
    if (!file) {
      return done(new Error('File not found'));
    }
  
    const filePath = file.localPath; // Update with the correct file path
  
    if (!fs.existsSync(filePath)) {
      return done(new Error('File not found'));
    }
  
    try {
      const sizes = [500, 250, 100];
      const promises = sizes.map(async (size) => {
        const thumbnail = await imageThumbnail(filePath, { width: size });
        const thumbnailPath = filePath.replace(/(\.[^/.]+)$/, `_${size}$1`);
        fs.writeFileSync(thumbnailPath, thumbnail);
      });
  
      await Promise.all(promises);
      done();
    } catch (error) {
      done(error);
    }
  });

// Process file uploads
fileQueue.process('uploadFile', async (job, done) => {
  const fileData = job.data;

  try {
    const { name, type, parentId, isPublic, data, userId } = fileData;

    if (type === 'folder') {
      const newFile = await dbClient.insertFileObject(fileData);
      done(null, newFile["ops"][0]);
      return;
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const localPath = path.join(folderPath, uuidV4());

    fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

    fileData.localPath = localPath;

    const newFile = await dbClient.insertFileObject(fileData);

    done(null, newFile["ops"][0]);
  } catch (error) {
    done(error);
  }
});

// Process user creation
userQueue.process('createUser', async (job, done) => {
  const { email, password } = job.data;
  const hashedPassword = sha1(password);

  try {
    await dbClient.insertUserObject({ email, password: hashedPassword });
    done();
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

export default userQueue;
export { fileQueue };
