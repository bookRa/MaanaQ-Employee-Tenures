/*=============================================================================
NAME:        Server.js
DESCRIPTION: Configure the graphql server.
===============================================================================
 copyright 2018 Maana Incorporated
 All Rights Reserved.

 NOTICE:  All information contained herein is, and remains the property
 of Maana Incorporated.  The intellectual and technical concepts contained
 herein are proprietary to Maana Inc. and may be covered by U.S. and
 Foreign Patents, patents in process, and are protected by trade secret
 and/or copyright law.  Dissemination of this information and/or
 reproduction of this material is strictly forbidden unless prior written
 permission is obtained from Maana Inc.
=============================================================================*/
// load .env into process.env.*
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

//
// Server setup
//
// Our service identity
const SELF = process.env.SERVICE_ID || 'io.maana.employeetenure'

// GraphQL schema (model)
const typeDefs = fs.readFileSync('src/schema.gql', { encoding: 'utf-8' })
// log(SELF).info(`typeDefs is ${print.json(typeDefs)}`)
// Compile schema
export const schema = makeExecutableSchema({
  typeDefs,
  resolvers
})

//
// Client setup
// - allow this service to be a client of a remote service
//

let client = null
let authToken = null

// HTTP port
const PORT = process.env.PORT
log(SELF).info(`port is ${PORT}`)
// HOSTNAME for subscriptions etc.
const HOSTNAME = process.env.HOSTNAME || 'localhost'

// External DNS name for service
const PUBLICNAME = process.env.PUBLICNAME || 'localhost'

const app = express()

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
    console.log(
      'Socket Authentication is disabled. This should not run in production'
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
      subscriptionsEndpoint: `ws://${HOSTNAME}:${PORT}/subscriptions`
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
