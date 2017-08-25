'use strict'

exports.__esModule = true // eslint-disable-line no-underscore-dangle

const React = require('react')
const ReactDOM = require('react-dom')

/**
 * @typedef {?function(this: ?Object, (React.Component|Element))} Listener
 * @typedef {function((React.Component|Element))} RefCallback
 */

const cache = {

  /**
   * @type {WeakMap<
   *         Object,
   *         {
   *           mounting: WeakMap<Listener, Map<boolean, RefCallback>>,
   *           unmounting: WeakMap<Listener, Map<boolean, RefCallback>>,
   *           full: WeakMap<
   *             Listener,
   *             WeakMap<Listener, Map<boolean, RefCallback>>
   *           >
   *         }
   *       >}
   */
  bound: new WeakMap(),

  unbound: {

    /**
     * @type {WeakMap<Listener, Map<boolean, RefCallback>>}
     */
    mounting: new WeakMap(),

    /**
     * @type {WeakMap<Listener, Map<boolean, RefCallback>>}
     */
    unmounting: new WeakMap(),

    /**
     * @type {WeakMap<Listener, WeakMap<Listener, Map<boolean, RefCallback>>>}
     */
    full: new WeakMap(),
  },
}

// We'll use an arrow function here to prevent calling it with the new operator
/**
 * Returns a callback to pass to the <code>ref</code> property of an React
 * element, that will invoke the provided callback when the referenced element
 * (or React component) is mounted to or unmounted from the DOM.
 *
 * Note that the returned ref callback is cached (using weak maps). The
 * returned callback cannot be used for more that a single referenced element /
 * component.
 *
 * @template {T}
 * @param {?T} context The <code>this</code> context for the
 *        <code>onMount</code> and <code>onUnmount</code> callbacks.
 * @param {?function(this: T, (React.Component|Element))} onMount The callback
 *        to invoke when the element is mounted to the DOM. Use
 *        <code>null</code> if you don't need to be notified of the element
 *        being mounted into the DOM.
 * @param {?function(this: T, (React.Component|Element))=} onUnmount The
 *        callback to invoke when the element is unmounted from the DOM. Use
 *        <code>null</code> if you don't need to be notified of the element
 *        being removed from the DOM.
 * @param {boolean} onlyElement When set to <code>true</code>, and React passes
 *        a component instance to the ref callback, the component instance will
 *        be automatically translated to its root element via
 *        <code>ReactDOM.findDOMNode()</code>. Note that this actually pierces
 *        the component abstraction, and there is most likely a better way to
 *        what you are trying to accomplish (see
 *        https://facebook.github.io/react/docs/react-dom.html#finddomnode for
 *        more info). Defaults to <code>false</code>.
 * @return {function((React.Component|Element))} The callback to pass to the
 *         <code>ref</code> property of a react element to observe.
 * @throws {TypeError} Thrown if the input for the <code>observe</code>
 *         function is invalid.
 */
const observe = (context, onMount, onUnmount = null, onlyElement = false) => {
  if (process.env.NODE_ENV !== 'production') {
    validateInput(context, onMount, onUnmount, onlyElement)
  }

  const cachedDomRefHandler = retrieveRefCallback(
    context,
    onMount,
    onUnmount,
    onlyElement
  )
  if (cachedDomRefHandler) {
    return cachedDomRefHandler
  }

  let lastDomElement = null
  const domRefHandler = domElement => {
    if (domElement) {
      if (process.env.NODE_ENV !== 'production') {
        if (lastDomElement) {
          throw new Error(
            'It appears you have attempted to use the same configuration to ' +
            'observe multiple elements. This is not permitted as it usually ' +
            'leads to weird errors or makes the code in the observing ' +
            'functions unnecessarily complicated.'
          )
        }
      }

      lastDomElement = domElement
      if (onlyElement) {
        lastDomElement = ReactDOM.findDOMNode(lastDomElement)
      }
      safelyCallCallback(context, onMount, lastDomElement)
    } else {
      safelyCallCallback(context, onUnmount, lastDomElement)
      lastDomElement = null
    }
  }
  storeRefCallback(context, onMount, onUnmount, onlyElement, domRefHandler)

  return domRefHandler
}

/**
 * Validates the input for the <code>observe</code> function. This function
 * should not be invoked in production in order to achieve better performance.
 *
 * @template {T}
 * @param {?T} context The <code>this</code> context for the
 *        <code>onMount</code> and <code>onUnmount</code> callbacks.
 * @param {?function(this: T, (React.Component|Element))} onMount The callback
 *        to invoke when the element is mounted to the DOM.
 * @param {?function(this: T, (React.Component|Element))} onUnmount The
 *        callback to invoke when the element is unmounted from the DOM.
 * @param {boolean} onlyElement The <code>onlyElement</code> flag.
 * @throws {TypeError} Thrown if the input for the <code>observe</code>
 *         function is invalid.
 */
function validateInput(context, onMount, onUnmount, onlyElement) {
  if (!['object', 'function'].includes(typeof context)) {
    throw new TypeError(
      'The context must be either an object or null'
    )
  }
  if (onMount !== null && typeof onMount !== 'function') {
    throw new TypeError(
      'The onMount callback must be either a function or null'
    )
  }
  if (onUnmount !== null && typeof onUnmount !== 'function') {
    throw new TypeError(
      'The onUnmount callback must be either a function or null'
    )
  }
  if (typeof onlyElement !== 'boolean') {
    throw new TypeError('The onlyElement flag must be a boolean')
  }

  if (!onMount && !onUnmount) {
    throw new TypeError(
      'At least one of the onMount and onUnmount callbacks must be provided'
    )
  }
}

/**
 * Retrieves the previously generated ref callback for the provided combination
 * of context, listeners and <code>onlyElement</code> flag from the cache.
 *
 * @template {T}
 * @param {?T} context The <code>this</code> context for the
 *        <code>onMount</code> and <code>onUnmount</code> callbacks.
 * @param {?function(this: T, (React.Component|Element))} onMount The callback
 *        to invoke when the element is mounted to the DOM.
 * @param {?function(this: T, (React.Component|Element))} onUnmount The
 *        callback to invoke when the element is unmounted from the DOM.
 * @param {boolean} onlyElement The <code>onlyElement</code> flag.
 * @return {?RefCallback} The ref callback stored in the cache, or
 *         <code>null</code> or <code>undefined</code> if no ref callback has
 *         been generated for the provided combination of context, listeners
 *         and flag yet.
 */
function retrieveRefCallback(context, onMount, onUnmount, onlyElement) {
  const contextCache = context ? cache.bound.get(context) : cache.unbound
  if (!contextCache) {
    return null
  }

  let refMap
  if (onMount && !onUnmount) {
    refMap = contextCache.mounting.get(onMount)
  } else if (!onMount && onUnmount) {
    refMap = contextCache.unmounting.get(onUnmount)
  } else { // both callback have been provided
    const listenerMap = contextCache.full.get(onMount)
    refMap = listenerMap && listenerMap.get(onUnmount)
  }

  return refMap && refMap.get(onlyElement)
}

/**
 * Stores the generated ref callback within the cache.
 *
 * @template {T}
 * @param {?T} context The <code>this</code> context for the
 *        <code>onMount</code> and <code>onUnmount</code> callbacks.
 * @param {?function(this: T, (React.Component|Element))} onMount The callback
 *        to invoke when the element is mounted to the DOM.
 * @param {?function(this: T, (React.Component|Element))} onUnmount The
 *        callback to invoke when the element is unmounted from the DOM.
 * @param {boolean} onlyElement The <code>onlyElement</code> flag.
 * @param {RefCallback} refCallback The generated ref callback to store in the
 *        cache.
 */
function storeRefCallback(
  context, onMount, onUnmount, onlyElement, refCallback
) {
  const contextCache = prepareContextCache(context)

  let refMap
  if (onMount && !onUnmount) {
    refMap = contextCache.mounting.get(onMount)
    if (!refMap) {
      refMap = new Map()
      contextCache.mounting.set(onMount, refMap)
    }
  } else if (!onMount && onUnmount) {
    refMap = contextCache.unmounting.get(onUnmount)
    if (!refMap) {
      refMap = new Map()
      contextCache.unmounting.set(onUnmount, refMap)
    }
  } else { // both callback have been provided
    refMap = prepareFullCycleCacheRefMap(contextCache, onMount, onUnmount)
  }

  refMap.set(onlyElement, refCallback)
}

/**
 * Prepares the cache for the provided mount and unmount listeners for use
 * (storing the generated ref callbacks).
 *
 * @param {{
 *          full: WeakMap<
 *            Listener,
 *            WeakMap<Listener, Map<boolean, RefCallback>>
 *          >
 *        }} contextCache
 * @param {Listener} onMount The callback to invoke when the element is mounted
 *        to the DOM.
 * @param {Listener} onUnmount The callback to invoke when the element is
 *        unmounted from the DOM.
 * @return {Map<boolean, RefCallback>} The cache map to use for storing the
 *         generated ref callbacks generated from the provided mount and
 *         unmount listeners.
 */
function prepareFullCycleCacheRefMap(contextCache, onMount, onUnmount) {
  let listenerMap = contextCache.full.get(onMount)
  if (!listenerMap) {
    listenerMap = new WeakMap()
    contextCache.full.set(onMount, listenerMap)
  }

  let refMap = listenerMap.get(onUnmount)
  if (!refMap) {
    refMap = new Map()
    listenerMap.set(onUnmount, refMap)
  }

  return refMap
}

/**
 * Prepares the cache for the provided context object for use (storing the
 * generated ref callbacks).
 *
 * @param {?Object} context The <code>this</code> context for mount/unmount
 *        listeners being processed.
 * @return {{
 *           mounting: WeakMap<Listener, Map<boolean, RefCallback>>,
 *           unmounting: WeakMap<Listener, Map<boolean, RefCallback>>,
 *           full: WeakMap<
 *             Listener,
 *             WeakMap<Listener, Map<boolean, RefCallback>>
 *           >
 *         }} The cache to use for the provided context.
 */
function prepareContextCache(context) {
  if (context) {
    let contextCache = cache.bound.get(context)
    if (!contextCache) {
      contextCache = {
        mounting: new WeakMap(),
        unmounting: new WeakMap(),
        full: new WeakMap(),
      }
      cache.bound.set(context, contextCache)
    }

    return contextCache
  }

  return cache.unbound
}

/**
 * Invokes the provided callback function, if any is provided. The function
 * will have its <code>this</code> context set to the provided context object
 * and will be invoked with the provided argument.
 *
 * @template T
 * @template A
 * @param {?T} context The <code>this</code> context for the callback.
 * @param {?function(this: ?T, A)} callback The callback to invoke.
 * @param {A} argument The argument to pass to the callback.
 */
function safelyCallCallback(context, callback, argument) {
  if (callback) {
    callback.call(context, argument)
  }
}

exports.default = observe
