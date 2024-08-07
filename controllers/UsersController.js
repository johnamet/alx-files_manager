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
      return res.status(400).send({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }

    const existingUser = await dbClient.findUser({ email });

    console.log(existingUser);

    if (existingUser.length !== 0) {
      return res.status(400).send({ error: 'Already exists' });
    }

    const hashedPassword = hashPassword(password);

    const result = await dbClient.insertObject({ email, password: hashedPassword });

    return res.status(201).send({ email, id: result.insertedId });
  }
}

export default UsersController;
