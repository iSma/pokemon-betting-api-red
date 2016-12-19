const Glue = require('glue')

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
            'description': 'An API for betting on Pokémon battles'
          },
          documentationPath: '/doc',
          tags: [
            // TODO
          ]
        }
      }
    },
    { plugin: './config' },
    { plugin: './models' },
    { plugin: './auth' },
    { plugin: './sync' },
    { plugin: './controllers/users' },
    { plugin: './controllers/battles' },
    { plugin: './controllers/bets' },
    { plugin: './controllers/trainers' },
    { plugin: './controllers/pokemons' },
    { plugin: './controllers/login' },
    { plugin: './controllers/graph' }
    // ...
  ]
}

Glue.compose(manifest, { relativeTo: __dirname }, (err, server) => {
  if (err) throw err
  server.ext('onPreResponse', require('hapi-cors-headers'))
  server.start((err) => {
    if (err) throw err
    const msg = `Server running at: ${server.info.uri}`
    const bar = msg.replace(/./g, '=')
    console.log()
    console.log()
    console.log()
    console.log(bar)
    console.log(msg)
    console.log(bar)
    console.log()
    console.log()
    console.log()
  })
})
