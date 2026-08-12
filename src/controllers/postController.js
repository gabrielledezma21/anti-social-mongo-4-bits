const { Post, Comment, Archive, Tag, User } = require("../models");
const { redisClient } = require('../config/redisClient')
const { getModelByIdCache, getModelsCache, deleteModelByIdCache, deleteManyModelsCache, deleteManyDbChildren } = require("./genericController")

const getPosts = async (_, res) => {
    const cached = await getModelsCache(Post)
    const posts = cached ? JSON.parse(cached) : await Post.find().populate('comments').populate('tags'); // Intenta obtener los posts del cache, si no están, los busca en la base de datos
    await redisClient.set('Posts:todos', JSON.stringify(posts), { EX: 300 })
    res.status(200).json(posts);
};

const getPostById = async (req, res) => {
    const cached = await getModelByIdCache(Post, req.params.id)   //Intenta obtener el post del cache
    const post = cached ? JSON.parse(cached) : await Post.findById(req.params.id).populate({ path:'comments', select: 'userId content fecha -_id'}).populate({ path: 'tags', select: 'tag -_id' });  //Si no está en el cache, lo busca en la base de datos
    await redisClient.set(`Post:${req.params.id}`, JSON.stringify(post), { EX: 300 })  // Guarda el post en el cache con una expiración de 300 segundos
    res.status(200).json(post);
};

const createPost = async (req, res) => {
    const post = await Post.create(req.body);
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { $push: { posts: post._id } }, { new: true }); // Agrega el post al usuario
    await deleteManyModelsCache([User, Post]) // Elimina el cache del usuario que creó el post
    res.status(201).json(post);
};

const updatePostById = async (req, res) => {
    await Post.findByIdAndUpdate(req.params.id, req.body, { new: true })
    await deleteModelByIdCache(Post, req.params.id)
    await deleteManyModelsCache([User, Post])//Borro cache de modelo actual y de padre
    res.status(200).json({ message: "Post actualizado correctamente" });
};

const deletePostById = async (req, res) => {
    const postId = req.params.id;
    //Obtener el post en una constante
    const post = await Post.findById(postId);
    //Borrar los comentarios, archivos y tags del post
    await deleteManyDbChildren([Archive, Comment, Tag], { postId: postId }); 
    await Post.findByIdAndDelete(postId);
    await deleteModelByIdCache(Post, postId);
    await deleteManyModelsCache([User, Post])//Borro cache de modelo actual y de padre
    //Borrar el post del usuario que lo creó
    await User.findByIdAndUpdate(
        post.userId, //El id del usuario que creó el post
        {
            $pull: {
                posts: postId, //Elimina el post del array de posts del usuario
                comments: { $in: post.comments } //Elimina los comentarios del post del array de comentarios del usuario
            }
        }
    )
    res.status(200).json({ message: "Post eliminado correctamente" });
};

const actualizarTag = (metodo) => {
    return async (req, res) => {
        if (metodo == "agregar") {
            await Post.findByIdAndUpdate(req.params.postId, { $push: { tags: req.params.tagId } }, { new: true });
            await Tag.findByIdAndUpdate(req.params.tagId, { $push: { posts: req.params.postId } }, { new: true });
        } else {
            await Post.findByIdAndUpdate(req.params.postId, { $pull: { tags: req.params.tagId } }, { new: true });
            await Tag.findByIdAndUpdate(req.params.tagId, { $pull: { posts: req.params.postId } }, { new: true });
        }
            await deleteModelByIdCache(Post, req.params.id) 
            //Borro cache de modelo actual y de padre
            await deleteManyModelsCache([User, Post])
            res.status(200).json({ message: `Tag ${metodo == "agregar" ? "agregado" : "eliminado"} correctamente` });
        
    }
}

const getPostsByUser = async (req, res) => {
    const posts = await Post.find({ userId: req.params.userId }).populate('comments').populate('tags');
    res.status(200).json(posts);
};

module.exports = { getPostsByUser, getPosts, getPostById, createPost, updatePostById, deletePostById, actualizarTag };
