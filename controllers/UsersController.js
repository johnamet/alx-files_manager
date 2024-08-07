import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import userQueue from '../utils/queue';

/**
 * UsersController class handles user-related operations.
 */
class UsersController {
  /**
   * Creates a new user in the database.
   *
   * @param {object} req - The request object containing the body with email and password.
   * @param {object} res - The response object used to send back the appropriate HTTP response.
   */
  static async postNew(req, res) {
    const { email, password } = req.body;

    // Check if email is provided
    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }

    // Check if password is provided
    if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }

    try {
      // Check if a user with the provided email already exists
      const existingUser = await dbClient.findOne({ email });

      if (existingUser) {
        return res.status(400).send({ error: 'Already exists' });
      }

      // Add a job to the queue for user creation
      const job = await userQueue.add('createUser', { email, password });

      job.finished().then(() => res.status(201).send({ email })).catch((error) => {
        console.error(error);
        return res.status(500).send({ error: 'Internal server error' });
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    }

    return {};
  }

  /**
   * Retrieves the authenticated user's information based on the token.
   *
   * @param {object} req - The request object containing the headers with the authentication token.
   * @param {object} res - The response object used to send back the appropriate HTTP response.
   */
  static async getMe(req, res) {
    const token = req.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await dbClient.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    return res.status(200).send({ email: user.email, id: user._id.toString() });
  }
}

export default UsersController;
