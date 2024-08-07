import { v4 as uuidV4 } from 'uuid';
import redisClient from '../utils/redis';
import userQueue from '../utils/queue';

/**
 * Parses the Basic Authorization header.
 *
 * @param {string} authHeader - The Authorization header containing the Basic auth string.
 * @returns {object|null} - An object with email and password, or null if the header is invalid.
 */
function parseAuthorizationHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [email, password] = credentials.split(':');

  console.log(credentials);

  console.log(email);
  console.log(password);

  return { email, password };
}

/**
 * AuthController class handles authentication-related operations.
 */
class AuthController {
  /**
   * Signs in the user by generating a new authentication token.
   *
   * @param {object} req - The request object containing the headers with the Basic auth string.
   * @param {object} res - The response object used to send back the appropriate HTTP response.
   */
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    const credentials = parseAuthorizationHeader(authHeader);

    if (!credentials) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const { email, password } = credentials;

    const job = await userQueue.add('signInUser', { emailSignIn: email, passwordSignIn: password });

    job.finished().then((user) => {
      if (!user) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const token = uuidV4();
      const key = `auth_${token}`;
      redisClient.set(key, user._id.toString(), 24 * 60 * 60);

      return res.status(200).send({ token });
    }).catch((error) => {
      console.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    });

    // Ensure there's always a return value
    return {};
  }

  /**
   * Signs out the user based on the token.
   *
   * @param {object} req - The request object containing the headers with the authentication token.
   * @param {object} res - The response object used to send back the appropriate HTTP response.
   */
  static async getDisconnect(req, res) {
    const token = req.header('X-Token');

    console.log(token);

    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const job = await userQueue.add('signOutUser', { token });

    job.finished().then(() => res.status(204).send({})).catch((error) => {
      console.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    });

    // Ensure there's always a return value
    return {};
  }
}

export default AuthController;
