const multer = require('multer');
const mongoose = require('mongoose');
const { redisClient } = require('../config/redisClient');

const logRequest = (req, _res, next) => {
  console.log({ method: req.method, url: req.url, fechaHora: new Date(), body: req.body, params: req.params });
  next();
};

const errorPersonalizado = (message, status, next) => {
  const error = new Error(message);
  error.status = status;
  return next(error);
};

const existsModelById = (model) => async (req, _res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return errorPersonalizado(`El ID de ${model.modelName} es inválido`, 400, next);
    const cached = await redisClient.get(`${model.modelName}:${id}`);
    if (!cached && !(await model.exists({ _id: id }))) return errorPersonalizado(`${model.modelName} con id ${id} no encontrado`, 404, next);
    return next();
  } catch (error) {
    return next(error);
  }
};

const existsAnyByModel = () => (_req, _res, next) => next();

const manejoDeErroresGlobales = (err, _req, res, _next) => {
  console.error('[api:error]', { name: err.name, message: err.message, code: err.code });
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors).map((item) => item.message) });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Identificador inválido' });
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'valor';
    return res.status(409).json({ error: `El ${field} ya se encuentra registrado` });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'La imagen excede el tamaño máximo permitido de 5MB' });
    return res.status(400).json({ error: err.message });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  return res.status(500).json({ error: 'Error interno del servidor' });
};

const validarCamposExactos = (model) => (req, _res, next) => {
  const validFields = Object.keys(model.schema.paths).filter((field) => !['_id', '__v'].includes(field));
  const invalidFields = Object.keys(req.body).filter((field) => !validFields.includes(field));
  if (invalidFields.length) return errorPersonalizado(`Campos inválidos: ${invalidFields.join(', ')}`, 400, next);
  return next();
};

const existModelRequest = (model) => async (req, _res, next) => {
  try {
    const field = `${model.modelName.toLowerCase()}Id`;
    const id = req.body[field];
    if (!id) return errorPersonalizado(`El ID del ${model.modelName} es requerido`, 400, next);
    if (!mongoose.Types.ObjectId.isValid(id)) return errorPersonalizado(`El ID del ${model.modelName} es inválido`, 400, next);
    if (!(await model.exists({ _id: id }))) return errorPersonalizado(`${model.modelName} con ID ${id} no encontrado`, 404, next);
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { logRequest, existsModelById, existsAnyByModel, manejoDeErroresGlobales, errorPersonalizado, validarCamposExactos, existModelRequest };
