require('./test-env');
module.exports = async () => {
  await require('../scripts/reset-test-db').resetTestDb();
};
