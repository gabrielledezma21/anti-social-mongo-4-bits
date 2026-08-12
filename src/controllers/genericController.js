const { redisClient } = require('../config/redisClient');

const getModelByIdCache = async (model, id) => redisClient.get(`${model.modelName}:${id}`);
const getModelsCache = async (model) => redisClient.get(`${model.modelName}s:todos`);

const deleteModelByIdCache = async (model, id) => {
  if (id) await redisClient.del(`${model.modelName}:${id}`);
};

const deleteModelsCache = async (model) => redisClient.del(`${model.modelName}s:todos`);
const deleteManyModelsCache = async (models) => Promise.all(models.map(deleteModelsCache));

const deleteManyDbParents = async (models, queryObject) =>
  Promise.all(models.map((model) => model.updateMany(queryObject, { $pull: queryObject })));

const deleteManyDbChildren = async (models, queryObject) =>
  Promise.all(models.map((model) => model.deleteMany(queryObject)));

module.exports = { getModelByIdCache, getModelsCache, deleteModelsCache, deleteModelByIdCache, deleteManyModelsCache, deleteManyDbParents, deleteManyDbChildren };
