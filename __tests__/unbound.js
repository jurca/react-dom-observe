const observe = require('../unbound').default
const ReactDOM = require('react-dom')

const NOOP = () => {}

describe('observe', () => {
  it('cannot be used a constructor', () => {
    expect(() => new observe(NOOP)).toThrow()
  })

  it('should skip the context argument', () => {
    const node = {}
    const componentInstance = {}
    let mountCalled = false
    let unmountCalled = false

    const originalImplementation = ReactDOM.findDOMNode
    ReactDOM.findDOMNode = instance => {
      expect(instance).toBe(componentInstance)
      return node
    }

    const refCallback = observe(mount, unmount, true)
    refCallback(componentInstance)
    refCallback(null)
    expect(mountCalled).toBe(true)
    expect(unmountCalled).toBe(true)

    ReactDOM.findDOMNode = originalImplementation

    function mount(arg) {
      expect(arg).toBe(node)
      mountCalled = true
    }

    function unmount(arg) {
      expect(arg).toBe(node)
      unmountCalled = true
    }
  })
})
