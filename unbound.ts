import observe, {Listener, RefCallback} from "./index.js"

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
export default (
  onMount: null | Listener<void>,
  onUnmount: null | Listener<void> = null,
  onlyElement: boolean = false,
): RefCallback => (
  observe(undefined, onMount, onUnmount, onlyElement)
)
