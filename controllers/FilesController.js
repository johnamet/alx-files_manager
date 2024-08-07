import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import { fileQueue } from '../utils/queue';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await dbClient.findOneUser({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) {
      return res.status(400).send({ error: 'Missing name' });
    }

    if (!['folder', 'file', 'image'].includes(type)) {
      return res.status(400).send({ error: 'Invalid type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).send({ error: 'Missing data' });
    }

    if (parentId) {
      const file = await dbClient.findOneFile({ _id: new ObjectId(parentId) });

      if (!file) {
        return res.status(400).send({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).send({ error: 'Parent is not a folder' });
      }
    }

    const fileData = {
      userId,
      name,
      type,
      isPublic,
      parentId,
      data, // Ensure data is included if type is not folder
    };

    try {
      const job = await fileQueue.add('uploadFile', fileData);

      job.finished().then((newFile) => res.status(201).send(newFile)).catch((err) => {
        res.status(500).send({ error: 'Internal server error', details: err });
      });
    } catch (err) {
      console.error(err);
      res.status(500).send({ error: 'Internal server error', details: err });
    }

    return {};
  }
}

export default FilesController;
