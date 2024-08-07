import sha1 from 'sha1';
import dbClient from '../utils/db';

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
      const existingUser = await dbClient.findUser({ email });

      if (existingUser.length > 0) {
        return res.status(400).send({ error: 'Already exists' });
      }

      // Hash the password using SHA1
      const hashedPassword = sha1(password);

      // Insert the new user into the database
      const result = await dbClient.insertObject({ email, password: hashedPassword });

      // Return the created user's email and ID
      return res.status(201).send({ id: result.insertedId.toString(), email });
    } catch (error) {
      // Log the error and return a 500 status code for internal server error
      console.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  }
}

export default UsersController;
