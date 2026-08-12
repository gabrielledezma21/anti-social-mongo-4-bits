const { Tag } = require('../models');
const { errorPersonalizado } = require('./genericMiddleware');

const notExistsTag = async (req, _res, next) => {
  try {
    const nameTag = req.body.nameTag?.trim();
    if (!nameTag) return errorPersonalizado('El nombre del tag es obligatorio', 400, next);
    const existing = await Tag.findOne({ nameTag });
    if (existing) return errorPersonalizado(`El tag ${nameTag} ya se encuentra registrado`, 409, next);
    req.body.nameTag = nameTag;
    return next();
  } catch (error) {
    return next(error);
  }
};

const postDoesntExists = (req, _res, next) => {
  if (req.body.posts !== undefined) return errorPersonalizado('No se pueden modificar posts desde el endpoint de tags', 400, next);
  return next();
};

module.exports = { notExistsTag, postDoesntExists };
