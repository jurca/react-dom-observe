'use strict'

const boundObserve = require('./index').default

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
 * @param {?function((React.Component|Element))} onMount The callback to invoke
 *        when the element is mounted to the DOM. Use <code>null</code> if you
 *        don't need to be notified of the element being mounted into the DOM.
 * @param {?function((React.Component|Element))=} onUnmount The callback to
 *        invoke when the element is unmounted from the DOM. Use
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
const observe = (onMount, onUnmount = null, onlyElement = false) =>
  boundObserve(null, onMount, onUnmount, onlyElement)

exports.default = observe
