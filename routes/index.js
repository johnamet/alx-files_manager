const express = require('express');

const router = express.Router();
const AppController = require("../controllers/AppController");

router.get("/status", AppController.getStatus);
router.get('/students', AppController.getStats);

module.exports = router;