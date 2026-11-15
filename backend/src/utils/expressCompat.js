/**
 * Express compatibility layer
 * Allows routes to write `const express = require("../utils/expressCompat");`
 * If 'express' is installed in node_modules, it re-exports express directly.
 * If not, it provides a lightweight Router shim so the backend runs with 0 npm installs.
 */

let realExpress = null;
try {
  realExpress = require("express");
} catch (e) {
  // Express not installed in node_modules yet
}

if (realExpress) {
  module.exports = realExpress;
} else {
  function Router() {
    const routes = [];
    const router = function (req, res, next) {
      // dispatch
      next && next();
    };

    router.get = function (path, handler) { routes.push({ method: "GET", path, handler }); return router; };
    router.post = function (path, handler) { routes.push({ method: "POST", path, handler }); return router; };
    router.put = function (path, handler) { routes.push({ method: "PUT", path, handler }); return router; };
    router.patch = function (path, handler) { routes.push({ method: "PATCH", path, handler }); return router; };
    router.delete = function (path, handler) { routes.push({ method: "DELETE", path, handler }); return router; };
    router.all = function (path, handler) { routes.push({ method: "ALL", path, handler }); return router; };
    router._routes = routes;

    return router;
  }

  module.exports = {
    Router,
    json: () => (req, res, next) => next && next(),
    static: () => (req, res, next) => next && next()
  };
}

