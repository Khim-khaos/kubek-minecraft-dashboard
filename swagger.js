const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Kubek Minecraft Dashboard API',
    description: 'Документация API для веб-панели управления серверами Minecraft',
  },
  host: 'localhost:4200',
  basePath: '/api',
  schemes: ['http'],
  securityDefinitions: {
    cookieAuth: {
      type: 'apiKey',
      in: 'cookie',
      name: 'kbk__hash',
      description: 'Аутентификация через куки kbk__hash и kbk__login'
    }
  }
};

const outputFile = './swagger-output.json';
const endpointsFiles = [
  './routers/accounts.js',
  './routers/auth.js',
  './routers/cores.js',
  './routers/fileManager.js',
  './routers/health.js',
  './routers/java.js',
  './routers/kubek.js',
  './routers/mods.js',
  './routers/plugins.js',
  './routers/servers.js',
  './routers/tasks.js',
  './routers/updates.js'
];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    console.log('Swagger documentation generated successfully');
});
