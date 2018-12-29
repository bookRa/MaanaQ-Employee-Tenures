import { log, print } from 'io.maana.shared'
import gql from 'graphql-tag'

import fetch from 'node-fetch'
import { ApolloClient } from 'apollo-client'
import { createHttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'

const SELF =
  (process.env.SERVICE_ID || io.maana.employeetenure) + '.IntervalClient'

// The interval service endpoint.  This endpoint is used by the Apollo client
// to perform the graphQL calls.
const service = new ApolloClient({
  link: createHttpLink({
    uri: process.env.INTERVAL_ENDPOINT_URL,
    fetch
  }),
  cache: new InMemoryCache()
})

// Converts the date scalar to a timestamp for interval calculus
const tenureToIntervalInput = tenure => {
  let intervalInput = []
  let startTime = Number(Date.parse(tenure.start))
  if (isNaN(startTime))
    throw new Error(`input ${tenure.start} is not a valid date`)
  intervalInput.push({ operation: 'GTE', real: startTime })
  if (tenure.end) {
    let endTime = Number(Date.parse(tenure.end))
    if (isNaN(endTime))
      throw new Error(`input ${tenure.end} is not a valid date`)
    intervalInput.push({ operation: 'LTE', real: endTime })
  }
  log(SELF).info(`in tenure2Interval: interval is ${print.json(intervalInput)}`)
  return intervalInput
  // return { start: startTime, end: endTime }
}

const startedBefore = (root, input) => {
  let t1 = tenureToIntervalInput(input.employee1.tenure)
  let t2 = tenureToIntervalInput(input.employee2.tenure)
  return t1[0].real < t2[0].real
}

const workedTogether = async (root, input) => {
  let query = gql`
    query INTERSECT($t1: [ConstraintInput]!, $t2: [ConstraintInput]!) {
      intersect(
        interval1: { constraints: $t1 }
        interval2: { constraints: $t2 }
      ) {
        isEmpty
      }
    }
  `
  let variables = {
    t1: tenureToIntervalInput(input.employee1.tenure),
    t2: tenureToIntervalInput(input.employee2.tenure)
  }
  // log(SELF).info(`variables are: ${print.json(variables)}`)
  let result = await service.query({ query, variables }) //query: sampQ }) //
  log(SELF).info(`result is: ${print.json(result)}`)
  if (result.data) {
    return !result.data.intersect.isEmpty
  } else {
    let msg = `Couldn't query Maana-Intervals for given inputs`
    log(SELF).error(msg)
    throw new Error(msg)
  }
}
const sampleInterval = async (root, input) => {
  let query = gql`
    query anInterval($constraints: [ConstraintInput]!) {
      interval(constraints: $constraints) {
        isFinite
      }
    }
  `
  let variables = {
    constraints: tenureToIntervalInput(input.employee.tenure)
  }

  let result = await service.query({ query, variables })
  log(SELF).info(`result is: ${print.json(result)}`)
  if (result.data) {
    return result.data.interval.isFinite
  } else throw new Error(`Uh-oh there's a problem, mate!`)
}

export const IntervalClient = {
  startedBefore,
  workedTogether,
  sampleInterval
}
