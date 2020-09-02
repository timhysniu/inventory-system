const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Mysql = require('mysql');
const Pack = require('./package');
const routes = require('./routes');
const dbConfig = require('./database/config');


const init = async () => {
  const pool = Mysql.createPool(dbConfig);

  const swaggerOptions = {
    info: {
      title: 'Test API Documentation',
      version: Pack.version,
    },
  };

  const server = Hapi.server({
    port: 3000,
    host: 'localhost'
  });

  server.decorate('request', 'getConn', function () {
    return pool;
  });

  if(process.env.NODE_ENV !== 'test') {
    await server.register([
      Inert,
      Vision,
      {
        plugin: HapiSwagger,
        options: swaggerOptions
      }
    ]);
  }

  // initialize routes
  routes.initRoutes(server);

  await server.start();
  console.log(`Server running on ${server.info.uri} with NODE_ENV=${process.env.NODE_ENV}`, );
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

module.exports = init;
