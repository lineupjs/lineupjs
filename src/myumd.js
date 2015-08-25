
//based on https://github.com/ForbesLindesay/umd but with d3 dependency
;(function (f) {
  // CommonJS
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f(require)(1);

    // RequireJS
  } else if (typeof define === "function" && define.amd) {
    var deps = [DEPENDENCIES];
    define(deps, function () {
      var resolved_deps = arguments;
      return f(function(name) { return resolved_deps[deps.indexOf(name)]; })(1);
    });
    // <script>
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      // works providing we're not in "use strict";
      // needed for Java 8 Nashorn
      // seee https://github.com/facebook/react/issues/3037
      g = this;
    }
    g.NAMESPACE = f(function(name) { return g[name]; })(1);
  }

})(function (require) {
  return SOURCECODE
});
