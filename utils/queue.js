import Queue from 'bull';
import sha1 from 'sha1';
import dbClient from './db'; // Make sure this path is correct
import redisClient from './redis';

/**
 * Queue for handling user-related operations.
 * @type {Queue}
 */
const userQueue = new Queue('userQueue', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  },
});

/**
 * Process different types of jobs in the queue.
 */
userQueue.process('createUser', async (job, done) => {
  const { email, password } = job.data;
  const hashedPassword = sha1(password);
  try {
    await dbClient.insertObject({ email, password: hashedPassword });
    done();
  } catch (error) {
    done(error);
  }
});

userQueue.process('signInUser', async (job, done) => {
  const { emailSignIn, passwordSignIn } = job.data;
  const hashedPasswordSignIn = sha1(passwordSignIn.trim());
  console.log(hashedPasswordSignIn);

  try {
    const user = await dbClient.findOne({ email: emailSignIn });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

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
