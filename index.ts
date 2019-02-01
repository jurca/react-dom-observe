import * as React from "react"
import * as ReactDOM from "react-dom"

export type Listener<T> = (this: T, referenceTarget: React.Component | Element) => void
export type RefCallback = (referenceTarget: React.Component | Element) => void

interface IRefCallbacksCache {
  mounting: WeakMap<Listener<any>, Map<boolean, RefCallback>>
  unmounting: WeakMap<Listener<any>, Map<boolean, RefCallback>>
  full: WeakMap<Listener<any>, WeakMap<Listener<any>, Map<boolean, RefCallback>>>
}

const cache = {
  bound: new WeakMap<object, IRefCallbacksCache>(),
  unbound: {
    full: new WeakMap<Listener<any>, WeakMap<Listener<any>, Map<boolean, RefCallback>>>(),
    mounting: new WeakMap<Listener<any>, Map<boolean, RefCallback>>(),
    unmounting: new WeakMap<Listener<any>, Map<boolean, RefCallback>>(),
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
 */
export default <T extends null | object>(
  context: T,
  onMount: null | Listener<T>,
  onUnmount: null | Listener<T> = null,
  onlyElement: boolean = false,
): RefCallback => {
  if (process.env.NODE_ENV !== "production") {
    validateInput(context, onMount, onUnmount, onlyElement)
  }

  const cachedDomRefHandler = retrieveRefCallback(context, onMount, onUnmount, onlyElement)
  if (cachedDomRefHandler) {
    return cachedDomRefHandler
  }

  let lastDomElement: null | Element | React.Component = null
  const domRefHandler: RefCallback = (domElement) => {
    if (domElement) {
      if (process.env.NODE_ENV !== "production") {
        if (lastDomElement) {
          throw new Error(
            "It appears you have attempted to use the same configuration to observe multiple elements. This is not " +
            "permitted as it usually leads to weird errors or makes the code in the observing functions " +
            "unnecessarily complicated.",
          )
        }
      }

      lastDomElement = domElement
      if (onlyElement) {
        lastDomElement = ReactDOM.findDOMNode(lastDomElement) as null | Element
      }
      safelyCallCallback(context, onMount, lastDomElement!)
    } else {
      safelyCallCallback(context, onUnmount, lastDomElement!)
      lastDomElement = null
    }
  }
  storeRefCallback(context, onMount, onUnmount, onlyElement, domRefHandler)

  return domRefHandler
}

/**
 * Validates the input for the <code>observe</code> function. This function
 * should not be invoked in production in order to achieve better performance.
 */
function validateInput<T extends null | object>(
  context: T,
  onMount: null | Listener<T>,
  onUnmount: null | Listener<T>,
  onlyElement: boolean,
): void {
  if (!["object", "function"].includes(typeof context)) {
    throw new TypeError("The context must be either an object or null")
  }
  if (onMount !== null && typeof onMount !== "function") {
    throw new TypeError("The onMount callback must be either a function or null")
  }
  if (onUnmount !== null && typeof onUnmount !== "function") {
    throw new TypeError("The onUnmount callback must be either a function or null")
  }
  if (typeof onlyElement !== "boolean") {
    throw new TypeError("The onlyElement flag must be a boolean")
  }

  if (!onMount && !onUnmount) {
    throw new TypeError("At least one of the onMount and onUnmount callbacks must be provided")
  }
}

/**
 * Retrieves the previously generated ref callback for the provided combination
 * of context, listeners and <code>onlyElement</code> flag from the cache.
 */
function retrieveRefCallback<T extends null | object>(
  context: T,
  onMount: null | Listener<T>,
  onUnmount: null | Listener<T>,
  onlyElement: boolean,
): void | null | RefCallback {
  const contextCache = context ? cache.bound.get(context as object) : cache.unbound
  if (!contextCache) {
    return null
  }

  let refMap
  if (onMount && !onUnmount) {
    refMap = contextCache.mounting.get(onMount)
  } else if (!onMount && onUnmount) {
    refMap = contextCache.unmounting.get(onUnmount)
  } else { // both callback have been provided
    const listenerMap = contextCache.full.get(onMount!)
    refMap = listenerMap && listenerMap.get(onUnmount!)
  }

  return refMap && refMap.get(onlyElement)
}

/**
 * Stores the generated ref callback within the cache.
 */
function storeRefCallback<T extends null | object>(
  context: T,
  onMount: null | Listener<T>,
  onUnmount: null | Listener<T>,
  onlyElement: boolean,
  refCallback: RefCallback,
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
    refMap = prepareFullCycleCacheRefMap(contextCache, onMount!, onUnmount!)
  }

  refMap.set(onlyElement, refCallback)
}

/**
 * Prepares the cache for the provided mount and unmount listeners for use
 * (storing the generated ref callbacks).
 */
function prepareFullCycleCacheRefMap(
  contextCache: IRefCallbacksCache,
  onMount: Listener<any>,
  onUnmount: Listener<any>,
): Map<boolean, RefCallback> {
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
 */
function prepareContextCache<T extends null | object>(context: T): IRefCallbacksCache {
  if (context) {
    let contextCache = cache.bound.get(context as object)
    if (!contextCache) {
      contextCache = {
        full: new WeakMap<Listener<any>, WeakMap<Listener<any>, Map<boolean, RefCallback>>>(),
        mounting: new WeakMap<Listener<any>, Map<boolean, RefCallback>>(),
        unmounting: new WeakMap<Listener<any>, Map<boolean, RefCallback>>(),
      }
      cache.bound.set(context as object, contextCache)
    }

    return contextCache
  }

  return cache.unbound
}

/**
 * Invokes the provided callback function, if any is provided. The function
 * will have its <code>this</code> context set to the provided context object
 * and will be invoked with the provided argument.
 */
function safelyCallCallback<T, A>(context: T, callback: null | ((this: T, argument: A) => void), argument: A): void {
  if (callback) {
    callback.call(context, argument)
  }
}
