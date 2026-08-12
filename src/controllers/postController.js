const { Post, Comment, Archive, Tag, User } = require("../models");
const { redisClient } = require('../config/redisClient');
const { getModelByIdCache, getModelsCache, deleteModelByIdCache, deleteManyModelsCache } = require("./genericController");

const getPosts = async (_req, res) => {
  const cached = await getModelsCache(Post);
  const posts = cached ? JSON.parse(cached) : await Post.find().populate('comments').populate('tags').populate('imagenes');
  await redisClient.set('Posts:todos', JSON.stringify(posts), { EX: 300 });
  res.status(200).json(posts);
};

const getPostById = async (req, res) => {
  const cached = await getModelByIdCache(Post, req.params.id);
  const post = cached ? JSON.parse(cached) : await Post.findById(req.params.id).populate('comments').populate('tags').populate('imagenes');
  await redisClient.set(`Post:${req.params.id}`, JSON.stringify(post), { EX: 300 });
  res.status(200).json(post);
};

const getPostsByUser = async (req, res) => {
  const posts = await Post.find({ userId: req.params.userId }).populate('comments').populate('tags').populate('imagenes');
  res.status(200).json(posts);
};

const createPost = async (req, res) => {
  const post = await Post.create(req.body);
  await User.findByIdAndUpdate(req.body.userId, { $addToSet: { posts: post._id } });
  await deleteManyModelsCache([User, Post]);
  res.status(201).json(post);
};

const updatePostById = async (req, res) => {
  const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('comments').populate('tags').populate('imagenes');
  await Promise.all([deleteModelByIdCache(Post, req.params.id), deleteManyModelsCache([User, Post])]);
  res.status(200).json(updatedPost);
};

const deletePostById = async (req, res) => {
  const post = await Post.findById(req.params.id);
  const commentIds = post.comments || [];
  const archiveIds = post.imagenes || [];

  await Promise.all([
    Comment.deleteMany({ postId: post._id }),
    Archive.deleteMany({ postId: post._id }),
    Tag.updateMany({ posts: post._id }, { $pull: { posts: post._id } }),
    User.updateOne({ _id: post.userId }, { $pull: { posts: post._id } }),
    User.updateMany({ comments: { $in: commentIds } }, { $pull: { comments: { $in: commentIds } } }),
  ]);
  await Post.deleteOne({ _id: post._id });

  await Promise.all([
    deleteModelByIdCache(Post, post._id),
    ...commentIds.map((id) => deleteModelByIdCache(Comment, id)),
    ...archiveIds.map((id) => deleteModelByIdCache(Archive, id)),
    deleteManyModelsCache([User, Post, Comment, Archive, Tag]),
  ]);
  res.status(200).json({ message: "Post eliminado correctamente" });
};

const actualizarTag = (method) => async (req, res) => {
  const { postId, tagId } = req.params;
  const adding = method === "agregar";
  const [post, tag] = await Promise.all([
    Post.findByIdAndUpdate(postId, adding ? { $addToSet: { tags: tagId } } : { $pull: { tags: tagId } }, { new: true, runValidators: true }).populate('tags'),
    Tag.findByIdAndUpdate(tagId, adding ? { $addToSet: { posts: postId } } : { $pull: { posts: postId } }, { new: true, runValidators: true }),
  ]);
  await Promise.all([
    deleteModelByIdCache(Post, postId),
    deleteModelByIdCache(Tag, tagId),
    deleteManyModelsCache([User, Post, Tag]),
  ]);
  res.status(200).json({ message: `Tag ${adding ? "agregado" : "eliminado"} correctamente`, post, tag });
};

module.exports = { getPostsByUser, getPosts, getPostById, createPost, updatePostById, deletePostById, actualizarTag };
