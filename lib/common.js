const Boom = require('boom');

const failAction = (req, h, err) => {
  throw Boom.badData(err.message);
};

module.exports = {
  failAction
}