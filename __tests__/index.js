const observe = require('..').default
const ReactDOM = require('react-dom')

const NOOP = () => {}

describe('observe', () => {
  it('cannot be used a constructor', () => {
    expect(() => new observe(null, NOOP)).toThrow()
  })

  it('rejects anything except a null or an object as context', () => {
    expect(() => observe(true, NOOP)).toThrow()
    expect(() => observe(1, NOOP)).toThrow()
    expect(() => observe('1', NOOP)).toThrow()
    expect(() => observe(Symbol('1'), NOOP)).toThrow()
    expect(() => observe(undefined, NOOP)).toThrow()

    observe(null, NOOP)
    observe({}, NOOP)
    observe([], NOOP)
    observe(NOOP, NOOP) // functions are objects too
  })

  it('rejects anything except a callback or a null as mount callback', () => {
    expect(() => observe(null, true)).toThrow()
    expect(() => observe(null, 1)).toThrow()
    expect(() => observe(null, '1')).toThrow()
    expect(() => observe(null, Symbol('1'))).toThrow()
    expect(() => observe(null, undefined)).toThrow()

    observe(null, null, NOOP)
    observe(null, NOOP)
  })

  it(
    'rejects anything except a callback or a null as unmount callback',
    () => {
      expect(() => observe(null, NOOP, true)).toThrow()
      expect(() => observe(null, NOOP, 1)).toThrow()
      expect(() => observe(null, NOOP, '1')).toThrow()
      expect(() => observe(null, NOOP, Symbol('1'))).toThrow()

      observe(null, null, NOOP)
      observe(null, NOOP, null)
      // undefined will be replaced by the default argument value (null)
      observe(null, NOOP, undefined)
    }
  )

  it('rejects anything except a boolean as the onlyElement flag', () => {
    expect(() => observe(null, NOOP, null, null)).toThrow()
    expect(() => observe(null, NOOP, null, 1)).toThrow()
    expect(() => observe(null, NOOP, null, '1')).toThrow()
    expect(() => observe(null, NOOP, null, Symbol('1'))).toThrow()

    observe(null, NOOP, null, false)
    observe(null, NOOP, null, true)
    // undefined will be replaced by the default argument value (false)
    observe(null, NOOP, null, undefined)
  })

  it('rejects settings both mount and unmount callbacks to null', () => {
    expect(() => observe(null, null, null)).toThrow()
  })

  it('returns a function of arity 1', () => {
    const EXPECTED_ARITY = 1
    expect(typeof observe(null, NOOP)).toBe('function')
    expect(observe(null, NOOP).length).toBe(EXPECTED_ARITY)
  })

  it('caches the returned ref callback', () => {
    const context1 = null
    const context2 = {}
    const context3 = {}
    const mount1 = NOOP
    const mount2 = () => ''
    const unmount1 = NOOP
    const unmount2 = () => ''

    const combinations = []
    for (const context of [context1, context2, context3]) {
      for (const mount of [mount1, mount2]) {
        for (const unmount of [unmount1, unmount2]) {
          // eslint-disable-next-line max-depth
          for (const onlyElement of [false, true]) {
            combinations.push(observe(context, mount, unmount, onlyElement))
          }
        }
      }
    }
    expect(new Set(combinations).size).toBe(combinations.length)

    for (const context of [context1, context2, context3]) {
      for (const mount of [mount1, mount2]) {
        for (const unmount of [unmount1, unmount2]) {
          // eslint-disable-next-line max-depth
          for (const onlyElement of [false, true]) {
            const refCallback = observe(context, mount, unmount, onlyElement)
            expect(combinations.includes(refCallback)).toBe(true)
          }
        }
      }
    }
  })

  it(
    'calls the mount and unmount callbacks with the provided this context',
    () => {
      const context = {}
      let calledMount = false
      let calledUnmount = false
      const mount = function mount() {
        expect(this).toBe(context)
        if (calledMount) {
          throw new Error('The mount callback must be called only once')
        }
        calledMount = true
      }
      const unmount = function unmount() {
        expect(this).toBe(context)
        if (calledUnmount) {
          throw new Error('The unmount callback must be called only once')
        }
        calledUnmount = true
      }

      const refCallback = observe(context, mount, unmount)
      expect(calledMount).toBe(false)
      expect(calledUnmount).toBe(false)
      refCallback('fooBar')
      expect(calledMount).toBe(true)
      expect(calledUnmount).toBe(false)
      refCallback(null)
      expect(calledMount).toBe(true)
      expect(calledUnmount).toBe(true)
    }
  )

  it('calls the mount and unmount callbacks with the same argument', () => {
    const node = {}
    const refCallback = observe(null, mount, unmount)

    refCallback(node)
    refCallback(null)

    function mount(...args) {
      expect(args.length).toBe(1)
      expect(args.pop()).toBe(node)
    }

    function unmount(...args) {
      expect(args.length).toBe(1)
      expect(args.pop()).toBe(node)
    }
  })

  it('should allow omitting the mount callback', () => {
    const node = {}
    let unmountCalled = false

    const refCallback = observe(null, null, unmount)
    refCallback(node)
    expect(unmountCalled).toBe(false)
    refCallback(null)
    expect(unmountCalled).toBe(true)

    function unmount(arg) {
      expect(arg).toBe(node)
      if (unmountCalled) {
        throw new Error('The unmount callback must only be called once')
      }
      unmountCalled = true
    }
  })

  it('should allow omitting the unmount callback', () => {
    const node = {}
    let mountCalled = false

    const refCallback = observe(null, mount)
    refCallback(node)
    expect(mountCalled).toBe(true)
    refCallback(null)

    function mount(arg) {
      expect(arg).toBe(node)
      if (mountCalled) {
        throw new Error('The mount callback must only be called once')
      }
      mountCalled = true
    }
  })

  it(
    'should resolve components to DOM elements when the onlyElement flag is ' +
    'set',
    () => {
      const originalImplementation = ReactDOM.findDOMNode
      const node = {}
      const componentInstance = {}
      let finDOMNodeCalled = false
      ReactDOM.findDOMNode = instance => {
        expect(instance).toBe(componentInstance)
        finDOMNodeCalled = true
        return node
      }

      observe(null, mountComponent, null, false)(componentInstance)
      expect(finDOMNodeCalled).toBe(false)
      observe(null, mountNode, null, true)(componentInstance)
      expect(finDOMNodeCalled).toBe(true)

      ReactDOM.findDOMNode = originalImplementation

      function mountComponent(component) {
        expect(component).toBe(componentInstance)
      }

      function mountNode(providedNode) {
        expect(providedNode).toBe(node)
      }
    }
  )

  it('should prevent using the same ref callback on multiple elements', () => {
    const refCallback = observe(null, NOOP)
    refCallback({})
    expect(() => refCallback({})).toThrow()
  })
})
