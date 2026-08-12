console.log("UnaHur - Anti-Social net");

const express = require('express');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');
const swaggerDocumentation = require('../swaggerDoc.json');
const { genericMiddleware } = require("./middlewares");
const { userRoute, postRoute, tagRoute, commentRoute, archiveRoute } = require("./routes");
const { mongo, redis } = require('./config');
const { manejoDeErroresGlobales } = require("./middlewares/genericMiddleware");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(genericMiddleware.logRequest);

app.get('/', (req, res) => res.json({
  name: 'UnaHur Anti-Social API',
  status: 'online',
  documentation: '/docs',
  health: '/health'
}));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'anti-social-api' }));

delete swaggerDocumentation.host;
delete swaggerDocumentation.schemes;
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocumentation));

app.use(async (req, res, next) => {
  try {
    await mongo.conectarDB();
    await redis.conectarRedis();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/users", userRoute);
app.use("/comments", commentRoute);
app.use('/posts', postRoute);
app.use("/tags", tagRoute);
app.use("/archives", archiveRoute);
app.use(manejoDeErroresGlobales);

if (require.main === module) {
  app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
}

module.exports = app;
