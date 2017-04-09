/* eslint-env jasmine */

'use strict'

const observe = require('./index').default

const NOOP = () => {} // eslint-disable-line no-empty-function

describe('observe', () => {
  it('cannot be used a constructor', () => {
    expect(() => new observe()).toThrow() // eslint-disable-line new-cap
  })

  it('rejects anything except a null or an object as context', () => {
    // functions are objects too
    // eslint-disable-next-line no-magic-numbers
    expect(() => observe(1, NOOP)).toThrow()
    expect(() => observe('1', NOOP)).toThrow()
    expect(() => observe(Symbol('1'), NOOP)).toThrow()
    // eslint-disable-next-line no-undefined
    expect(() => observe(undefined, NOOP)).toThrow()

    observe(null, NOOP)
    observe({}, NOOP)
    observe([], NOOP)
    observe(NOOP, NOOP)
  })
})
