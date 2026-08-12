const { User, Post, Comment, Archive, Tag } = require("../models");
const { redisClient } = require('../config/redisClient');
const { getModelByIdCache, getModelsCache, deleteModelsCache, deleteModelByIdCache, deleteManyModelsCache } = require("./genericController");

const getUsers = async (_req, res) => {
  const cached = await getModelsCache(User);
  const users = cached ? JSON.parse(cached) : await User.find().populate('posts').populate('comments');
  await redisClient.set('Users:todos', JSON.stringify(users), { EX: 300 });
  res.status(200).json(users);
};

const getUserById = async (req, res) => {
  const cached = await getModelByIdCache(User, req.params.id);
  const user = cached ? JSON.parse(cached) : await User.findById(req.params.id).populate('posts').populate('comments');
  await redisClient.set(`User:${req.params.id}`, JSON.stringify(user), { EX: 300 });
  res.status(200).json(user);
};

const createUser = async (req, res) => {
  const user = await User.create(req.body);
  await deleteModelsCache(User);
  res.status(201).json(user);
};

const updateUserById = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  await Promise.all([deleteModelByIdCache(User, req.params.id), deleteModelsCache(User)]);
  res.status(200).json(user);
};

const deleteById = async (req, res) => {
  const userId = req.params.id;
  const posts = await Post.find({ userId }).select('_id imagenes');
  const postIds = posts.map((post) => post._id);
  await Promise.all([
    Comment.deleteMany({ $or: [{ userId }, { postId: { $in: postIds } }] }),
    Archive.deleteMany({ postId: { $in: postIds } }),
    Tag.updateMany({ posts: { $in: postIds } }, { $pull: { posts: { $in: postIds } } }),
    Post.deleteMany({ userId }),
    User.findByIdAndDelete(userId),
  ]);
  await Promise.all([deleteModelByIdCache(User, userId), deleteManyModelsCache([User, Post, Comment, Archive, Tag])]);
  res.status(200).json({ message: "Usuario eliminado correctamente" });
};

module.exports = { getUsers, getUserById, createUser, updateUserById, deleteById };
