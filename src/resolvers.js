require('dotenv').config()

import uuid from 'uuid'

import { log, print, MaanaDateScalar } from 'io.maana.shared'

import { IntervalClient } from './IntervalClient'

const SELF =
  process.env.SERVICE_ID + 'resolvers' || 'io.maana.template.resolvers'

// dummy in-memory store
const people = {}

export default {
  // Date: MaanaDateScalar,

  Query: {
    info: async () => {
      log(SELF).info('Info query was called')
      return {
        id: 'e5614056-8aeb-4008-b0dc-4f958a9b753a',
        name: 'io.maana.template',
        description: 'Maana Q Knowledge Service template'
      }
    },
    tenure1: async () => {
      return {
        start: 'Yesterday',
        end: 'Tomorrow'
      }
    },
    employee1: async () => {
      return [
        {
          id: 1,
          name: 'Omar',
          position: 'DEV',
          tenure: {
            start: '11/12/18',
            end: null
          }
        },
        {
          id: 1,
          name: 'Steve',
          position: 'CS',
          tenure: {
            start: '5/6/15',
            end: null
          }
        }
      ]
    },

    startedBefore: (root, input) => IntervalClient.startedBefore(root, input),
    workedTogether: (root, input) => IntervalClient.workedTogether(root, input),
    sampleInterval: (root, input) => IntervalClient.sampleInterval(root, input)

    // allPeople: async () => Object.values(people),
    // person: async (_, { id }) => people[id]
  }
  // Mutation: {
  //   addPerson: async (_, { input }) => {
  //     if (!input.id) {
  //       input.id = uuid.v4()
  //     }
  //     people[input.id] = input
  //     pubsub.publish('personAdded', { personAdded: input })
  //     return input.id
  //   }
  // },
  // Subscription: {
  //   personAdded: {
  //     subscribe: (parent, args, ctx, info) =>
  //       pubsub.asyncIterator('personAdded')
  //   }
  // }
}
