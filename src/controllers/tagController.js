const { Tag, Post } = require("../models");
const { redisClient } = require('../config/redisClient');
const { getModelByIdCache, getModelsCache, deleteModelsCache, deleteModelByIdCache, deleteManyModelsCache } = require("./genericController");

const getTags = async (_req, res) => {
  const cached = await getModelsCache(Tag);
  const tags = cached ? JSON.parse(cached) : await Tag.find().populate({ path: 'posts', select: 'fecha content userId' });
  await redisClient.set('Tags:todos', JSON.stringify(tags), { EX: 300 });
  res.status(200).json(tags);
};

const getTagById = async (req, res) => {
  const cached = await getModelByIdCache(Tag, req.params.id);
  const tag = cached ? JSON.parse(cached) : await Tag.findById(req.params.id).populate('posts');
  await redisClient.set(`Tag:${req.params.id}`, JSON.stringify(tag), { EX: 300 });
  res.status(200).json(tag);
};

const createTag = async (req, res) => {
  const tag = await Tag.create({ nameTag: req.body.nameTag.trim() });
  await deleteModelsCache(Tag);
  res.status(201).json(tag);
};

const updateTagById = async (req, res) => {
  const tag = await Tag.findByIdAndUpdate(req.params.id, { nameTag: req.body.nameTag?.trim() }, { new: true, runValidators: true });
  await Promise.all([deleteModelByIdCache(Tag, req.params.id), deleteModelsCache(Tag)]);
  res.status(200).json(tag);
};

const deleteById = async (req, res) => {
  const tagId = req.params.id;
  await Promise.all([
    Tag.findByIdAndDelete(tagId),
    Post.updateMany({ tags: tagId }, { $pull: { tags: tagId } }),
  ]);
  await Promise.all([deleteModelByIdCache(Tag, tagId), deleteManyModelsCache([Tag, Post])]);
  res.status(200).json({ message: "Tag eliminado correctamente" });
};

module.exports = { getTags, getTagById, createTag, updateTagById, deleteById };
