const Post = require("../models/post");
const Archive = require("../models/archive");
const mongoose = require("mongoose");
const { redisClient } = require("../config/redisClient");
const multer = require('multer');
const path = require('path');
const { errorPersonalizado, validarId } = require('./genericMiddleware');

const sinPostID = async (req, res, next) => {
  const postId = req.body.postId;  

  const cached = await redisClient.get(`Post:${postId}`);
  if (cached) {
    req.post = JSON.parse(cached);
    return next();
  }

  const post = await Post.findById(postId);
  await redisClient.set(`Post:${postId}`, JSON.stringify(post), { EX: 300 });
  req.post = post;
  next();
};

const archiveById = async (req, res, next) => {
  const archiveId = req.params.id?.trim();

  if (!archiveId || !mongoose.Types.ObjectId.isValid(archiveId)) {return errorPersonalizado('El ID de la imagen es inválido', 400, next)}

  const cached = await redisClient.get(`Archive:${archiveId}`);
  if (cached) {
    const parsed = JSON.parse(cached);
    req.archive = Archive.hydrate(parsed);
    return next();
  }

  const archive = await Archive.findById(archiveId);
  if (!archive) { return errorPersonalizado('Imagen no encontrada', 404, next)}

  await redisClient.set(`Archive:${archiveId}`, JSON.stringify(archive), { EX: 300 });
  req.archive = archive;
  next();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (allowedTypes.test(ext) && allowedTypes.test(mime)) {
    cb(null, true);
  } else {
    const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
    error.message = 'Solo se permiten imágenes (jpg, jpeg, png, gif)';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

module.exports = { archiveById, fileFilter, upload };
