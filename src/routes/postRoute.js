const { Router } = require('express')
const { postController, archiveController } = require("../controllers");
const { genericMiddleware, postMiddleware } = require("../middlewares");
const { Post, Archive, User } = require("../models");
const upload = require('../middlewares/upload');
const router = Router()

router.get('/',
  genericMiddleware.existsAnyByModel(Post),
  /* 
#swagger.tags = ['Posts']
#swagger.path = '/posts'
*/
  postController.getPosts);

router.get('/user/:userId',
  postController.getPostsByUser
);

router.get('/:id',
  genericMiddleware.existsModelById(Post),
  /* 
#swagger.tags = ['Posts']
#swagger.path = '/posts/{id}'
*/
  postController.getPostById);


router.post("/",
  genericMiddleware.validarCamposExactos(Post),
  postMiddleware.tagOrCommentDontExists,
  genericMiddleware.existModelRequest(User),
  /* 
    #swagger.tags = ['Posts']
    #swagger.path = '/posts'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Datos del post (userId y content)',
      required: true,
      schema: { $ref: "#/definitions/PostInput" }
    }
  */
  postController.createPost
);

router.put("/:id",
  genericMiddleware.existsModelById(Post),
  genericMiddleware.validarCamposExactos(Post),
  postMiddleware.tagOrCommentDontExists,
  postMiddleware.userDoesntChange,
  /* 
    #swagger.tags = ['Posts']
    #swagger.path = '/posts/{id}'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Solo el contenido del post',
      required: true,
      schema: { $ref: "#/definitions/PostUpdateInput" }
    }
  */
  postController.updatePostById
);

router.delete("/:id",
  genericMiddleware.existsModelById(Post),
  /* 
    #swagger.tags = ['Posts']
    #swagger.path = '/posts/{id}'
    */
  postController.deletePostById
);

router.post(
  '/:postId/tags/:tagId',
  postMiddleware.existsPostYTagPorId,
  /* 
    #swagger.tags = ['Post Tag']
    #swagger.path = '/posts/{postId}/tags/{tagId}'
  */
  postController.actualizarTag("agregar")
);

router.delete(
  '/:postId/tags/:tagId',
  postMiddleware.existsPostYTagPorId,
  /* 
    #swagger.tags = ['Post Tag']
    #swagger.path = '/posts/{postId}/tags/{tagId}'
  */
  postController.actualizarTag("eliminar")
);

//Rutas Archive
router.delete("/:postId/image/:id",
  genericMiddleware.existsModelById(Archive),
  postMiddleware.validarImagenAsociadaAPost,
  /* 
    #swagger.tags = ['Post Image']
    #swagger.path = '/posts/{postId}/archives/{id}'
  */
  archiveController.deleteById
);

  router.put("/:postId/image/:id",
    genericMiddleware.existsModelById(Archive),
    postMiddleware.validarImagenAsociadaAPost,
    upload.single('imagenes'),
    /* 
    #swagger.tags = ['Post Image']
    #swagger.path = '/posts/{postId}/archives/{id}'
    */
    archiveController.updateArchive
  );

module.exports = router;