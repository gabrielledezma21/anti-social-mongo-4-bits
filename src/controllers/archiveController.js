const { Archive, Post } = require("../models");
const { getModelsCache } = require("./genericController");
const { redisClient } = require('../config/redisClient');

const invalidateArchiveCaches = async (postId, archiveId) => {
  const keys = ['Archives:todos', 'Posts:todos'];
  if (postId) keys.push(`Post:${postId}`);
  if (archiveId) keys.push(`Archive:${archiveId}`);
  await Promise.all(keys.map((key) => redisClient.del(key)));
};

const getArchives = async (_req, res) => {
  const cached = await getModelsCache(Archive);
  const archives = cached ? JSON.parse(cached) : await Archive.find();
  await redisClient.set('Archives:todos', JSON.stringify(archives), { EX: 300 });
  res.status(200).json(archives);
};

const getArchiveContent = async (req, res) => {
  const archive = await Archive.findById(req.params.id).select('+data +mimeType');
  if (!archive?.data) {
    return res.status(404).json({ error: 'Contenido de imagen no encontrado' });
  }

  res.set({
    'Content-Type': archive.mimeType || 'application/octet-stream',
    'Content-Length': archive.data.length,
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  return res.send(archive.data);
};

const createArchives = async (req, res) => {
  const { postId } = req.body;
  const files = req.files;

  if (!files?.length) {
    return res.status(400).json({ error: 'No se subieron imágenes' });
  }

  const newArchives = await Promise.all(
    files.map(async (file) => {
      const archive = new Archive({
        postId,
        imagen: 'pending',
        data: file.buffer,
        mimeType: file.mimetype,
      });
      archive.imagen = `/archives/${archive._id}/content`;
      return archive.save();
    })
  );

  await Post.findByIdAndUpdate(
    postId,
    { $addToSet: { imagenes: { $each: newArchives.map((archive) => archive._id) } } },
    { new: true, runValidators: true }
  );

  await invalidateArchiveCaches(postId);
  res.status(201).json(newArchives);
};

const updateArchive = async (req, res) => {
  if (req.body.postId !== undefined) {
    return res.status(400).json({ error: 'No se puede modificar el postId de una imagen' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'El campo "imagenes" es obligatorio' });
  }

  const archive = await Archive.findByIdAndUpdate(
    req.params.id,
    {
      data: req.file.buffer,
      mimeType: req.file.mimetype,
      imagen: `/archives/${req.params.id}/content`,
    },
    { new: true, runValidators: true }
  );

  await invalidateArchiveCaches(archive.postId, archive._id);
  res.status(200).json(archive);
};

const deleteById = async (req, res) => {
  const archive = await Archive.findByIdAndDelete(req.params.id);
  if (!archive) {
    return res.status(404).json({ error: 'Imagen no encontrada' });
  }

  await Post.findByIdAndUpdate(
    archive.postId,
    { $pull: { imagenes: archive._id } }
  );
  await invalidateArchiveCaches(archive.postId, archive._id);
  res.status(200).json({ message: 'Imagen eliminada correctamente', deletedArchive: archive });
};

module.exports = {
  getArchives,
  getArchiveContent,
  createArchives,
  updateArchive,
  deleteById,
};
