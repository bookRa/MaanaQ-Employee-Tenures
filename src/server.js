/*=============================================================================
NAME:        Server.js
DESCRIPTION: Configure the graphql server.
===============================================================================*/
//
// External Exports
//

require('dotenv').config()

// File system access
import fs from 'nano-fs'
// HTTP server
import { createServer } from 'http'
// routing engine
import express from 'express'
// middleware to assemble content from HTTP
import bodyParser from 'body-parser'
// middleware to support GraphQL
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
// GraphQL core operations
import { execute, subscribe } from 'graphql'
// GraphQL schema compilation
import { makeExecutableSchema } from 'graphql-tools'

let timeout = require('connect-timeout')

//
// Internal imports
//
import {
  log,
  print,
  ServiceAuthenticationClient,
  formatError,
  errorHandlerMiddleware
} from 'io.maana.shared'

// GraphQL resolvers (implementation)
import resolvers from './resolvers'

// GraphQL schema (model)
const typeDefs = fs.readFileSync('src/schema.gql', { encoding: 'utf-8' })

// Compile schema
export const schema = makeExecutableSchema({
  typeDefs,
  resolvers
})

//
// Client setup
// - allow this service to be a client of a remote service
//
let client
const clientSetup = token => {
  if (!client) {
    // construct graphql client using endpoint and context
    client = BuildGraphqlClient(REMOTE_KSVC_ENDPOINT_URL, (_, { headers }) => {
      // return the headers to the context so httpLink can read them
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : ''
        }
      }
    })
  }
}

//
// Server setup
//
// Our service identity
const SELF = process.env.SERVICE_ID || 'io.maana.template'

// HTTP port
const PORT = process.env.PORT

// HOSTNAME for subscriptions etc.
const HOSTNAME = process.env.HOSTNAME || 'localhost'

// External DNS name for service
const PUBLICNAME = process.env.PUBLICNAME || 'localhost'

// Remote (peer) services we use
const REMOTE_KSVC_ENDPOINT_URL = process.env.REMOTE_KSVC_ENDPOINT_URL

const app = express()

//
// CORS
//
const corsOptions = {
  origin: `http://${PUBLICNAME}:3000`,
  credentials: true // <-- REQUIRED backend setting
}

app.use(cors(corsOptions)) // enable all CORS requests
app.options('*', cors()) // enable pre-flight for all routes

app.get('/', (req, res) => {
  res.send(`${SELF}\n`)
})

const defaultHttpMiddleware = [
  graphqlExpress({
    schema,
    formatError: formatError(SELF)
  })
]

const defaultSocketMiddleware = (connectionParams, webSocket) => {
  return new Promise(function(resolve, reject) {
    log(SELF).warn(
      'Socket Authentication is disabled. This should not run in production.'
    )
    resolve()
  })
}

const initServer = options => {
  let { httpAuthMiddleware, socketAuthMiddleware } = options
  let httpMiddleware = httpAuthMiddleware
    ? [
        httpAuthMiddleware,
        errorHandlerMiddleware(SELF),
        ...defaultHttpMiddleware
      ]
    : [errorHandlerMiddleware(SELF), ...defaultHttpMiddleware]

  let socketMiddleware = socketAuthMiddleware
    ? socketAuthMiddleware
    : defaultSocketMiddleware

  app.use('/graphql', bodyParser.json(), httpMiddleware)

  app.use(
    '/graphiql',
    graphiqlExpress({
      endpointURL: '/graphql',
      subscriptionsEndpoint: `ws://${HOSTNAME}:${PORT}/subscriptsion`
    })
  )

  app.use(
    bodyParser.json({ limit: '500mb' }),
    bodyParser.raw({ limit: '500mb' }),
    timeout(600000)
  )

  const server = createServer(app)

  server.listen(PORT, () => {
    log(SELF).info(
      `listening on ${print.external(`http://${HOSTNAME}:${PORT}`)}`
    )

    if (process.env.REACT_APP_PORTAL_AUTH_DOMAIN) {
      let authClient = new ServiceAuthenticationClient({
        domain: process.env.REACT_APP_PORTAL_AUTH_DOMAIN,
        clientId: process.env.REACT_APP_PORTAL_AUTH_CLIENT_ID,
        clientSecret: process.env.REACT_APP_PORTAL_AUTH_CLIENT_SECRET,
        audience: process.env.REACT_APP_PORTAL_AUTH_IDENTIFIER,
        tokenCallback: clientSetup
      })
    }
  })
}

export default initServer
