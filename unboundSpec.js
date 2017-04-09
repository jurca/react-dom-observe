/* eslint-env jasmine */

'use strict'

const observe = require('./unbound').default

describe('observe', () => {
  it('cannot be used a constructor', () => {
    expect(() => new observe()).toThrow() // eslint-disable-line new-cap
  })
})
