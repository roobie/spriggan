# Asynchronous content

**Hello from Spriggan!** This message is fetched from the server, demonstrating that the framework supports asynchronous operations.

Try opening the console to see the debug logs. In debug mode, Spriggan provides detailed insights into state updates, effects, and potential issues, and exposes a history of state changes and a time travel feature for easier debugging.

Example:

```javaScript
console.log(window.app.debug.history); // => array of entries
window.app.debug.timeTravel(0); // time travel to the initial state
```
