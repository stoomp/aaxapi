import { GraphQLServer, PubSub } from 'graphql-yoga'
import express from 'express'
import session from 'express-session'
const MemStore = process.env.STAGE==='dev' ? require('memorystore')(session) : require('connect-redis')(session)

import { typeDefs, resolvers, fragmentReplacements } from './schema'
import prisma from './prisma'
import initScheduleJob from './utils/scheduler'
import { middlewareShield } from './middleware/shield'

initScheduleJob()

const pubsub = new PubSub()

const server = new GraphQLServer({
    typeDefs,
    resolvers,
    // middlewares: middlewareShield,
    context:({request, response}) => ({
        store: process.env.STAGE==='dev' ? new MemStore({ checkPeriod: 86400000 }) : new MemStore({ url: process.env.REDIS_URL }) ,
        pubsub,
        prisma,
        request,
        response,
        session: request ? request.session : undefined,
        url: request ? request.protocol + "://" + request.get("host") : ""
    }),
    fragmentReplacements
})

server.express.use(session(
  {
    name: "qid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 900000
    }
  })
)
server.express.use('/images', express.static('images'))

export { server as default }
