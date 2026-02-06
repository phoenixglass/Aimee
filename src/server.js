const config = require('./config');
const app = require('./app');

app.listen(config.port, () => {
  console.log(`Aimee Wine Assistant API running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`API: http://localhost:${config.port}/api`);
});
