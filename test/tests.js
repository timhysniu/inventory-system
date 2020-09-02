const { expect } = require('@hapi/code');
const Lab = require('@hapi/lab');
const Hapi = require('@hapi/hapi');
const routes = require('../routes');

const { afterEach, beforeEach, describe, it } = exports.lab = Lab.script();

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

describe('GET /', () => {
  let server;

  beforeEach(async () => {
    server = Hapi.server({
      port: 3000,
      host: 'localhost'
    });

    routes.initRoutes(server);
    server.start()
  });

  afterEach(async () => {
      await server.stop();
  });

  it('responds with 200', async () => {
      const res = await server.inject({
          method: 'get',
          url: '/'
      });

      expect(res.payload).to.equal('works');
  });
});