const { Comment, Post, User } = require('../models');
const { redisClient } = require('../config/redisClient');
const { getModelsCache, getModelByIdCache, deleteManyModelsCache, deleteManyDbParents } = require('./genericController');

const getComments = async (_req, res) => {
  const rangeMonths = Number.parseInt(process.env.RANGO_VISIBILIDAD, 10) || 6;
  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() - rangeMonths);
  const cached = await getModelsCache(Comment);
  const comments = cached
    ? JSON.parse(cached).filter((comment) => new Date(comment.fecha) >= limitDate)
    : await Comment.find({ fecha: { $gte: limitDate } });
  await redisClient.set('Comments:todos', JSON.stringify(comments), { EX: 300 });
  res.status(200).json(comments);
};

const getCommentById = async (req, res) => {
  const cached = await getModelByIdCache(Comment, req.params.id);
  const comment = cached ? JSON.parse(cached) : await Comment.findById(req.params.id);
  await redisClient.set(`Comment:${req.params.id}`, JSON.stringify(comment), { EX: 300 });
  res.status(200).json(comment);
};

const getCommentsByUser = async (req, res) => {
  const comments = await Comment.find({ userId: req.params.userId });
  res.status(200).json(comments);
};

const createComment = async (req, res) => {
  const comment = await Comment.create(req.body);
  await Promise.all([
    Post.findByIdAndUpdate(req.body.postId, { $addToSet: { comments: comment._id } }),
    User.findByIdAndUpdate(req.body.userId, { $addToSet: { comments: comment._id } }),
  ]);
  await deleteManyModelsCache([Comment, Post, User]);
  res.status(201).json({ message: 'Comentario creado', comment });
};

const updateComment = async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.id,
    { content: req.body.content, fecha: new Date() },
    { new: true, runValidators: true },
  );
  await deleteManyModelsCache([Comment, Post, User]);
  res.status(200).json({ message: 'Comentario actualizado', comment });
};

const deleteComment = async (req, res) => {
  const deletedComment = await Comment.findByIdAndDelete(req.params.id);
  await deleteManyDbParents([User, Post], { comments: req.params.id });
  await deleteManyModelsCache([Comment, Post, User]);
  res.status(200).json({ message: 'Comentario eliminado', deletedComment });
};

module.exports = { getCommentsByUser, getComments, getCommentById, createComment, updateComment, deleteComment };
