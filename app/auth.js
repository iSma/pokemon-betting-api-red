'use strict'
const JWT = require('jsonwebtoken')
const Boom = require('boom')

// Generate random key of size bytes, base64-encoded
const key = (size = 64) => require('crypto').randomBytes(size).toString('base64')

module.exports.register = (server, options, next) => {
  const { User } = server.app.db.models
  const config = server.app.config.auth

  const nonces = { }

  const secret = key(256) // Generate new key on server startup

  function token (user) {
    if (!user) throw Boom.unauthorized('Wrong username/password')

    const tok = {
      sub: user.id
    }

    return renonce(tok)
  }

  function renonce (tok) {
    tok = {
      sub: tok.sub
    }

    nonces[tok.sub] = key(16)

    return JWT.sign(tok, secret, {
      expiresIn: config.expiration || undefined,
      jwtid: config.nonce ? nonces[tok.sub] : undefined,
      issuer: config.issuer
    })
  }

  function login (name, pass) {
    return User
      .findOne({ where: { name: name } })
      .then((user) =>
        !user
          ? null
          : user.verify(pass).then((ok) => ok ? user : null))
      .then(token)
  }

  function logout (id) {
    nonces[id] = undefined
  }

  function validate (tok, req, callback) {
    // User isn't authenticated in this server session
    if (!nonces[tok.sub]) return callback(null, false)
    // Nonce is stale
    if (config.nonce && nonces[tok.sub] !== tok.jti) return callback(null, false)
    // Token has no expiration time
    if (config.expiration && !tok.exp) return callback(null, false)

    // Return fresh token, will be available as req.auth.credential.next
    tok.next = renonce(tok)
    return callback(null, true, tok)
  }

  server.register(require('hapi-auth-jwt2'), (err) => {
    if (err) throw err

    console.log(`JWT secret:\n${secret}`)
    server.app.login = login
    server.app.logout = logout

    server.auth.strategy('jwt', 'jwt', {
      key: secret,
      validateFunc: validate,
      verifyOptions: {
        algorithms: ['HS256'],
        issuer: config.issuer
      }
    })

    return next()
  })
}

module.exports.register.attributes = {
  name: 'auth',
  version: '1.0.0',
  dependencies: 'models'
}

