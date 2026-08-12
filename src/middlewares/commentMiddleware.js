const { errorPersonalizado } = require('./genericMiddleware');

const validateCommentBody = (allowedFields) => (req, _res, next) => {
  const fields = Object.keys(req.body);
  const invalidFields = fields.filter((field) => !allowedFields.includes(field));
  if (invalidFields.length > 0) {
    return errorPersonalizado(`Campos inválidos: ${invalidFields.join(', ')}`, 400, next);
  }

  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  if (content.length < 5 || content.length > 500) {
    return errorPersonalizado('El comentario debe tener entre 5 y 500 caracteres', 400, next);
  }

  req.body.content = content;
  return next();
};

const validateCreate = validateCommentBody(['postId', 'userId', 'content']);
const validateUpdate = validateCommentBody(['content']);

module.exports = { validateCreate, validateUpdate };
