const { Router } = require('express');
const router = Router();
const { Post, Archive } = require("../models");
const { archiveController } = require("../controllers");
const { archiveMiddleware, genericMiddleware } = require("../middlewares");
const upload = require('../middlewares/upload');

router.get('/', 
     /* 
        #swagger.tags = ['Archives']
        #swagger.path = '/archives'
    */
    archiveController.getArchives);

router.get('/:id/content',
    genericMiddleware.existsModelById(Archive),
    archiveController.getArchiveContent
);

router.post('/', 
    /* 
        #swagger.tags = ['Archives']
        #swagger.path = '/archives'
        #swagger.consumes = ['multipart/form-data']
        #swagger.parameters['postId'] = {
          in: 'formData',
          type: 'string',
          description: 'ID del post al que pertenece el archivo',
          required: true
        }
        #swagger.parameters['file'] = {
          in: 'formData',
          type: 'file',
          description: 'Archivo a subir',
          required: true
        }
    */
    upload.array('imagenes', 5), 
    genericMiddleware.existModelRequest(Post), 
    archiveController.createArchives);

router.put('/:id',
    /* 
        #swagger.tags = ['Archives']
        #swagger.path = '/archives/{id}'
        #swagger.consumes = ['multipart/form-data']
        #swagger.parameters['file'] = {
          in: 'formData',
          type: 'file',
          description: 'Archivo a subir',
          required: true
        }
    */
    archiveMiddleware.archiveById, 
    upload.single('imagenes'), 
    archiveController.updateArchive);

router.delete('/:id', 
    /* 
        #swagger.tags = ['Archives']
        #swagger.path = '/archives/{id}'
    */
    archiveMiddleware.archiveById, 
    archiveController.deleteById);

module.exports = router;