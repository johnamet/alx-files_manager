import crypto from 'crypto';
import dbClient from '../utils/db';

function hashPassword(password) {
  const hash = crypto.createHash('sha1');
  hash.update(password);

  return hash.digest('hex');
}
class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).send({ error: 'Missing email' });
    }

    if (!password) {
      res.status(400).send({ error: 'Missing password' });
    }

    const existingUser = await dbClient.findUser({ email });

    if (existingUser) {
      res.status(400).send({ error: 'Already exists' });
    }

    const hashedPassword = hashPassword(password);

    const result = await dbClient.insertObject({ email, password: hashedPassword });

    res.status(201).send({ email, id: result.InsertedId });
  }
}

export default UsersController;
