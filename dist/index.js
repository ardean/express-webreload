"use strict";

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _http = require("http");

var _http2 = _interopRequireDefault(_http);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _micromatch = require("micromatch");

var _micromatch2 = _interopRequireDefault(_micromatch);

var _socket = require("socket.io");

var _socket2 = _interopRequireDefault(_socket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function webReload(options) {
  options = options || {};

  const root = options.root || "./";
  const extensions = options.extensions || ["html", "htm"];
  const index = options.index || "index.html";
  const ignore = options.ignore || null;

  return function (req, res, next) {
    if (req.method === "GET" && req.accepts("html")) {
      let url = req.url;

      if (ignore && (typeof ignore === "string" || Array.isArray(ignore))) {
        if ((0, _micromatch2.default)(url, ignore).length > 0) return next();
      }

      if (url === "/__webreload/index.js") {
        return res.sendFile("client.js", {
          root: __dirname
        });
      }

      _fs2.default.stat(_path2.default.join(root, url), function (err, stat) {
        if (err) return next();

        if (stat.isDirectory()) {
          if (url[url.length - 1] === "/") {
            url = _path2.default.join("./", url, index);
            const html = injectScript(_fs2.default.readFileSync(_path2.default.join(root, url)));
            return sendHtmlContent(res, html);
          } else {
            return res.redirect(url + "/");
          }
        }

        if (extensions.indexOf(_path2.default.extname(url).substr(1)) > -1) {
          const html = injectScript(_fs2.default.readFileSync(_path2.default.join(root, url)));
          return sendHtmlContent(res, html);
        }

        next();
      });
    } else {
      next();
    }
  };
}

function injectScript(html) {
  return html + `
    <script src="/__webreload/sockets/socket.io.js"></script>
    <script src="/__webreload/index.js"></script>
  `;
}

function sendHtmlContent(res, html) {
  res.writeHeader(200, {
    "Content-Type": "text/html"
  });
  res.write(html);
  res.end();
}

webReload.init = function (socket) {
  socket = socket || new _http2.default.Server();

  webReload.clients = [];

  (0, _socket2.default)(socket, {
    path: "/__webreload/sockets"
  }).on("connection", client => {
    webReload.clients.push(client);

    client.once("disconnect", () => {
      const index = webReload.clients.indexOf(client);
      if (index > -1) {
        webReload.clients.splice(index, 1);
      }
    });
  });

  return socket;
};

webReload.reload = function () {
  webReload.clients && webReload.clients.forEach(client => client.emit("reload"));
};

module.exports = webReload;