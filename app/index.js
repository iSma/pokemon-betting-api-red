const Glue = require('glue');

const manifest = {
  connections: [{
    port: process.env.API_PORT || 3000
  }],

  registrations: [
    { plugin: 'inert' },
    { plugin: 'vision' },
    {
      plugin: {
        register: 'hapi-swagger',
        options: {
          info: {
            'title': 'Pokémon Betting API',
            'version': '1.0',
            'description': 'An API for betting on Pokémon battles',
          },
          documentationPath: '/doc',
          tags: [
            // TODO
          ]
        }
      }
    },
    { plugin: './models' },
    { plugin: './sync' },
    { plugin: './controllers/users' },
    { plugin: './controllers/events' },
    { plugin: './controllers/graph' },
    { plugin: './controllers/transactions' },
    // ...
  ]
};

Glue.compose(manifest, { relativeTo: __dirname }, (err, server) => {
  if (err) throw err;
  server.start((err) => {
    if (err) throw err;
    console.log(`Server running at: ${server.info.uri}`);
  });
});
