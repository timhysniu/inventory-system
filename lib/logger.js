const out = console;

const Logger = () => ({
  log: (...params) => out.log('[LOG]', ...params),
  info: (...params) => out.log('[INFO]', ...params),
  warn: (...params) => out.log('[WARN]', ...params),
  error: (...params) => out.log('[DEBUG]', ...params),
  debug: (...params) => out.log('[DEBUG]', ...params)
});

module.exports = Logger;