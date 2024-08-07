import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }

    try {
      const existingUser = await dbClient.findUser({ email });

      if (existingUser.length > 0) {
        return res.status(400).send({ error: 'Already exists' });
      }

      const hashedPassword = sha1(password);
      const result = await dbClient.insertObject({ email, password: hashedPassword });

      return res.status(201).send({ email, id: result.insertedId });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  }
}

export default UsersController;
