import { ObjectId } from 'mongodb';
import fs from 'fs';
import mime from 'mime-types';
import dbClient from '../utils/db';
import { fileQueue } from '../worker';
import redisClient from '../utils/redis';
import {type} from "mocha/lib/utils";

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

    if (!type) {
      return res.status(400).send({ error: 'Missing type' });
    }

    if (!['folder', 'file', 'image'].includes(type)) {
      return res.status(400).send({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).send({ error: 'Missing data' });
    }

    if (parentId) {
      const file = await dbClient.findOneFile({ parentId });

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

      job.finished().then(async (newFile) => {
        // if (type === 'image') {
        //   await fileQueue.add('generateThumbnails', { userId, fileId: newFile.insertedId });
        // }

        const file = newFile;
        file.id = newFile._id;
        delete file._id;

        res.status(201).send(newFile);
      }).catch((err) => {
        res.status(500).send({ error: 'Internal server error', details: err });
      });
    } catch (err) {
      console.error(err);
      res.status(500).send({ error: 'Internal server error', details: err });
    }

    return {};
  }

  static async getShow(req, res) {
    const parentId = req.params.id;

    const token = req.header('X-Token');
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const query = {
      parentId: '0'
    }

    try {
      const file = await dbClient.findOneFile({_id: new ObjectId(parentId),
        userId: new ObjectId(userId) });
      console.log(file);
      if (!file) {
        return res.status(404).send({ error: 'Not found' });
      }

      return res.status(200).send(file);
    } catch (error) {
      console.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);


    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const { parentId = '0', page = 0 } = req.query;
    const limit = 20;
    const skip = page * limit;

    try {
      const files = (await dbClient.findFiles({
        userId: ObjectId(userId),
        parentId: parentId !== '0' ? ObjectId(parentId): parentId,
      }, skip, limit)).map((file) => {
        file.id = file._id
        delete file._id
        return file;
      });

      console.log(files)

      return res.status(200).send(files);
    } catch (error) {
      console.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  }

  static async putPublish(req, res) {
    const fileId = req.params.id;
    const token = req.header('X-Token');
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    if (!ObjectId.isValid(fileId)) {
      return res.status(400).send({ error: 'Invalid ID format' });
    }

    try {
      const file = await dbClient.findOneFile({ _id: ObjectId(fileId),
        userId: ObjectId(userId) });

      if (!file) {
        return res.status(404).send({ error: 'Not found' });
      }

      await dbClient.updateFile({ _id: new ObjectId(fileId) }, { isPublic: true });

      const updatedFile = await dbClient.findOneFile({ _id: new ObjectId(fileId) });
      console.log(updatedFile);

      return res.status(200).send(updatedFile);
    } catch (error) {
      console.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  }

  static async putUnpublish(req, res) {
    const fileId = req.params.id;
    const token = req.header('X-Token');
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    if (!ObjectId.isValid(fileId)) {
      return res.status(400).send({ error: 'Invalid ID format' });
    }

    try {
      const file = await dbClient.findOneFile({ _id: ObjectId(fileId),
        userId: ObjectId(userId) });

      if (!file) {
        return res.status(404).send({ error: 'Not found' });
      }

      await dbClient.updateFile({ _id: new ObjectId(fileId) }, { isPublic: false });

      const updatedFile = await dbClient.findOneFile({ _id: new ObjectId(fileId) });

      return res.status(200).send(updatedFile);
    } catch (error) {
      console.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const { size } = req.query; // Accepting the size parameter
    const token = req.header('X-Token');
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);

    if (!ObjectId.isValid(fileId)) {
      return res.status(400).send({ error: 'Invalid ID format' });
    }

    try {
      const file = await dbClient.findOneFile({ _id: ObjectId(fileId), userId: ObjectId(userId) });

      if (!file) {
        console.log("File not found");
        return res.status(404).send({ error: 'Not found' });
      }

      if (!file.isPublic && (!userId || file.userId.toString() !== userId)) {
        return res.status(404).send({ error: 'Not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).send({ error: "A folder doesn't have content" });
      }

      let filePath = file.localPath; // Update with the correct file path

      if (size) {
        filePath = filePath.replace(/(\.[^/.]+)$/, `_${size}$1`);
      }

      if (!fs.existsSync(filePath)) {
        console.error("Path  does not exist")
        return res.status(404).send({ error: 'Not found' });
      }

      const mimeType = mime.lookup(file.name);

      res.setHeader('Content-Type', mimeType);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    }

    return {};
  }
}

export default FilesController;
