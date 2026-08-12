const {Comment, Post, User} = require('../models');
require('dotenv').config();
//Importar cliente de redis
const {redisClient} = require('../config/redisClient')

//Importar controladores de cache
const {getModelsCache, getModelByIdCache, deleteManyModelsCache, deleteManyDbParents} = require('./genericController');


//Obtener todos los comentarios -> getComments
const getComments = async (_, res) => {
    const rangoMeses = parseInt(process.env.RANGO_VISIBILIDAD) || 6;
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - rangoMeses);

    // Buscar comentarios dentro del rango de fechas usando el campo 'fecha'
    const cached = await getModelsCache(Comment);
    let comments;
    if (cached) {
        comments = JSON.parse(cached).filter(comment => new Date(comment.fecha) >= fechaLimite);
    } else {
        comments = await Comment.find({ fecha: { $gte: fechaLimite } });
    }

    await redisClient.set('Comments:todos', JSON.stringify(comments), { EX: 300 });
    res.status(200).json(comments);
}
//Obtener un comentario por id -> getCommentById
const getCommentById = async (req, res) => {
    /*
        Obtener un comentario por id
        req.params.id -> id del comentario
        Guardar el comentario en la cache con la key: comment:<commentId>
    */
    const commentId = req.params.id;//Obtiene el id del comentario
    const cached = await getModelByIdCache(Comment, commentId);//Obtiene el comentario de la cache
    //Si está cacheado, lo asigna a comment, sinó lo busca en la base de datos
    const comment = cached ? JSON.parse(cached) : await Comment.findById(commentId);
    //Guardar el comentario en la cache con la key: comment:commentId
    await redisClient.set(`Comment:${commentId}`, JSON.stringify(comment), { EX: 300 });
    res.status(200).json(comment);
};
//Crear un nuevo comentario con body-> createComment
const createComment = async (req, res) => {
    const comment = await Comment.create(req.body);//Crear el comentario
    //Agregar el comentario al post
    await Post.findByIdAndUpdate(req.body.postId, {
        $push: { comments: comment._id }
    });
    //Agregar el comentario al usuario
    await User.findByIdAndUpdate(req.body.userId, {
        $push: { comments: comment._id }
    });
    //Guardar el comentario en la cache con la key: comment:<commentId>
    await redisClient.set(`Comment:${comment._id}`, JSON.stringify(comment), { EX: 300 });
    //Eliminar los comentarios de la cache
    //Esto es necesario para que al crear un comentario, se actualicen los comentarios en la cache
    await deleteManyModelsCache([Comment, Post, User]);
    res.status(201).json({
        message: 'Comentario creado',
        comment
    });
}

//Actualizar un comentario por id -> updateComment
const updateComment = async (req,res) => {
    /*
        req.params.id -> id del comentario
        req.body -> datos a actualizar
    */
    await Comment.findByIdAndUpdate(req.params.id, req.body, {new: true})
    //Eliminar el comentario de la cache, junto con sus padres asociados
    await deleteManyModelsCache([Comment, Post, User]);
    //Retornar el comentario actualizado
    const updatedComment = await Comment.findById(req.params.id);
    res.status(200).json({
        message: 'Comentario actualizado',
        comment: updatedComment
    });
}
//Borrar un comentario por id -> deleteComment
const deleteComment = async (req, res) => {
    /*
        Borrar un comentario por id
        req.params.id -> id del comentario
        Eliminar el comentario de la cache con la key: comment:<commentId>
    */
    const commentId = req.params.id;
    //El middelware verificó que el comenario existe
    const deletedComment = await Comment.findByIdAndDelete(commentId);
    //Eliminar comentario de modelos
    await deleteManyDbParents([User, Post], { comments: commentId });

    //Eliminar el comentario de la cache, junto con sus padres asociados
    await deleteManyModelsCache([Comment, Post, User]);
    //Retornar el comentario eliminado
    res.status(200).json({
        message: 'Comentario eliminado',
        deletedComment
    });
    
}

const getCommentsByUser = async (req, res) => {
    const comments = await Comment.find({ userId: req.params.userId });
    res.status(200).json(comments);
};

module.exports ={ 
    getCommentsByUser,
    getComments,
    getCommentById,
    createComment,
    updateComment,
    deleteComment
}