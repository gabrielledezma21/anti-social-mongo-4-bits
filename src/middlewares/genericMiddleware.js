const multer = require('multer');
const { redisClient } = require('../config/redisClient');
const mongoose = require('mongoose');
const logRequest = (req, _, next) => {
    console.log({ method: req.method, url: req.url, fechaHora: new Date(), body: req.body, params: req.params });
    next();
};


const existsModelById = (modelo) => {
    return async (req, res, next) => {
        try {
            const id = req.params.id;
            const cached = await redisClient.get(`${modelo.modelName}:${id}`);
            if (!cached) {
                const data = await modelo.findById(id);
                if (!data) {
                    return errorPersonalizado(`${modelo.modelName} con id ${id} no se encuentra registrado en la base de datos` , 404, next);
                }
            }
        } catch (error) {
            return next(error);
        }
        next();
    };
};

const existsAnyByModel = () => {
    return (_req, _res, next) => next();
};

const errorPersonalizado = (message, status, next) => {
    const err = new Error(message);
    err.status = status;
    return next(err);
};

const manejoDeErroresGlobales = ((err, req, res, next) => {
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ error: messages });
    }
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {return res.status(400).json({ error: 'La imagen excede el tamaño máximo permitido de 5MB' })}
        return res.status(400).json({ error: err.message });
    }
    if (err.status) {
        return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
});

const validarCamposExactos = (modelo) => {
    return ( req, res, next ) => {
    const camposValidos = Object.keys(modelo.schema.paths);
    const camposRecibidos = Object.keys(req.body);
    const camposInvalidos = camposRecibidos.filter(campo => !camposValidos.includes(campo));

    if (camposInvalidos.length > 0) {
        return errorPersonalizado(`hay campos inválidos`, 400, next);
    }
    next()
    }
}

const existModelRequest = (modelo) => {
    return async (req, res, next) => {
        const nombreModelo = modelo.modelName;
        const modeloId = req.body[nombreModelo.toLowerCase() + "Id"];
        if (!modeloId) {
            return errorPersonalizado(`El ID del ${modelo.modelName} es requerido`, 400, next);
        }
        if (! mongoose.Types.ObjectId.isValid(modeloId)) {
            return errorPersonalizado(`El ID del ${modelo.modelName} es inválido`, 400, next)
        }
        const aux = await modelo.findById(modeloId);
        if (!aux) {
            return errorPersonalizado(`${modelo.modelName} con ID ${modeloId} no encontrado`, 404, next);
        }
        next();
    }
}

module.exports = { logRequest, existsModelById, existsAnyByModel, manejoDeErroresGlobales, errorPersonalizado, validarCamposExactos, existModelRequest };
