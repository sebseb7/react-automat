/**
 * @module automat
 *
 * Observable state management for React PureComponents with optional persistence.
 *
 * @example
 * import { Automat } from './lib/index.js';
 * import { PureComponent } from 'react';
 *
 * // Create an automat with optional persistence:
 * // persist: false (default) = window object; persist: true = IndexedDB
 * const counterAutomat = new Automat(
 *   { count: 0 },
 *   {
 *     increment() { counterAutomat.setState({ count: counterAutomat.state.count + 1 }); },
 *   },
 *   { name: 'counter', persist: false }
 * );
 *
 * class Display extends PureComponent {
 *   constructor(props) {
 *     super(props);
 *     this.state = counterAutomat.state;
 *   }
 *   componentDidMount() {
 *     this.unsubscribe = counterAutomat.subscribe(this);
 *   }
 *   componentWillUnmount() {
 *     this.unsubscribe();
 *   }
 *   render() {
 *     return <span>{this.state.count}</span>;
 *   }
 * }
 */
export { Automat } from './Automat.js';
