const { User } = require('../models');
const { errorPersonalizado } = require('./genericMiddleware');

const notExistsUser = async (req, _res, next) => {
  try {
    const [userByNickName, userByEmail] = await Promise.all([
      User.findOne({ nickName: req.body.nickName }),
      User.findOne({ email: req.body.email }),
    ]);
    if (userByNickName || userByEmail) {
      const attribute = userByNickName ? `nickName ${req.body.nickName}` : `email ${req.body.email}`;
      return errorPersonalizado(`El ${attribute} ya se encuentra registrado`, 409, next);
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

const postOrCommentDontExists = (req, _res, next) => {
  if (req.body.posts !== undefined || req.body.comments !== undefined) {
    return errorPersonalizado('No se pueden modificar posts o comentarios desde usuarios', 400, next);
  }
  return next();
};

module.exports = { notExistsUser, postOrCommentDontExists };
