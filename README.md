# react-dom-observe

Utility for easier monitoring of the lifecycle of React-created DOM elements
(and component instances) through references (`ref` callbacks).

## Installation

You can add the `react-dom-observe` to your project using npm:

```
npm i --save @jurca/react-dom-observe
```

## Usage

The library is designed to be used in ES2016 environment. Make sure you have
proper polyfills included in your project if you need backwards compatibility.

To require library in ES2015 import, use a regular import of the default module
export:

```javascript
import observe from '@jurca/react-dom-observe'
```

To require the library in a CommonJS environment, use the following pattern:

```javascript
const observe = require('@jurca/react-dom-observe').default
```

### Usage in components

The `react-dom-observe` library allows for, for example, easier registration
and deregistration of event listeners on DOM elements, without having to keep
references to the elements:

```javascript
class Component extends React.Component {
  constructor(props) {
    super(props)

    this._onFooBar = this.onFooBar.bind(this)
  }

  render() {
    return (
      <div ref={observe(this, this.onRootMounted, this.onRootUnmounted)}>
        <FooBar ref={observe(this, this.onFooBarMounted)}>
          A FooBar component content
        </FooBar>
      </div>
    )
  }

  onRootMounted(root) {
    root.addEventListener('fooBar', this._onFooBar)
  }

  onRootUnmounted(root) {
    root.removeEventListener('fooBar', this._onFooBar)
  }

  onFooBarMounted(fooBarInstance) {
    fooBarInstance.baz()
  }

  onFooBar(event) {
    // The fooBar event occurred
  }
}
```

The third argument (the element unmount callback) is optional. Alternatively,
if you only need to be notified about the component being unmounted, set the
mount callback to `null` and provide the unmount callback as the third
argument:

```javascript
class Foo extends React.Component {
  render() {
    return (
      <div ref={observe(this, null, this.onRootUnmounted)}>
        A Foo component
      </div>
    )
  }

  onRootUnmounted(root) {
    // root is the div element at the component's root that has just been
    // removed from the DOM
  }
}
```

### Usage in functional components

There is also a shorthand available for use in functional React components.
This shorthand skips the first (`this` context) argument:

```javascript
import observe from '@jurca/react-dom-observe/unbound'

const FooBar = props => {
  const onMounted = root => {
    // do something with the root
  }

  const onUnmounted = root => {
    // undo what has been done in the onMounted callback
  }

  return (
    <div ref={observe(onMounted, onUnmounted)}>
      A FooBar component
    </div>
  )
}
```
