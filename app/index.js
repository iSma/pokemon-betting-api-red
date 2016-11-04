const Glue = require('glue');

const manifest = {
  connections: [{
    port: process.env.API_PORT | 3000
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
    { plugin: './controllers/users' },
    // ...
  ]
};

Glue.compose(manifest, { relativeTo: __dirname }, (err, server) => {
  if (err) throw err;
  server.start((err) => {
    if (err) throw err;
    console.log(`Server running at: ${server.info.uri}`);

    setInterval(require('./sync'), 1000*30); // Sync every half minute
    // TODO: Extract sync period to global variable
  });
});
