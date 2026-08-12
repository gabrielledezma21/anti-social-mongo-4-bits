const {Router} = require('express');
const {commentController} = require('../controllers');
const {genericMiddleware, commentMiddleware} = require('../middlewares');
const {Comment, User, Post} = require('../models');
const router = Router();

//Obtener todos los comentarios
router.get('/',
    /* 
    #swagger.tags = ['Comments']
    #swagger.path = '/comments'
    */ 
    commentController.getComments
);

router.get('/user/:userId',
    commentController.getCommentsByUser
);

//Obtener un comentario por id
router.get('/:id',
    /* 
    #swagger.tags = ['Comments']
    #swagger.path = '/comments/{id}'
    */
    genericMiddleware.existsModelById(Comment),
    commentController.getCommentById
);

//Crear un nuevo comentario con body
router.post('/',
    /* 
    #swagger.tags = ['Comments']
    #swagger.path = '/comments'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Datos del comentario (userId, postId y content)',
      required: true,
      schema: { $ref: "#/definitions/CommentInput" }
    }
    */
    genericMiddleware.validarCamposExactos(Comment),
    genericMiddleware.existModelRequest(User),
    genericMiddleware.existModelRequest(Post),
    commentController.createComment
);

//Actualizar un comentario por id
router.put('/:id',
    /* 
    #swagger.tags = ['Comments']
    #swagger.path = '/comments/{id}'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Solo el contenido del comentario',
      required: true,
      schema: { $ref: "#/definitions/CommentUpdateInput" }
    }
    */
    genericMiddleware.existsModelById(Comment),
    commentController.updateComment
)
//Borrar un comentario por id
router.delete('/:id',
    /* 
    #swagger.tags = ['Comments']
    #swagger.path = '/comments/{id}'
    */
    genericMiddleware.existsModelById(Comment),
    commentController.deleteComment
)

//Exportar el router
module.exports = router;