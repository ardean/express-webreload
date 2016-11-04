import fs from "fs";
import http from "http";
import path from "path";
import SocketIOServer from "socket.io";

function webReload(options) {
  options = options || {};

  const root = options.root || "./";
  const extensions = options.extensions || ["html", "htm"];
  const index = options.index || "index.html";

  return function (req, res, next) {
    if (req.method === "GET" && req.accepts("html")) {
      let url = req.url;
      if (url === "/__webreload/index.js") {
        return res.sendFile("client.js", {
          root: __dirname
        });
      }

      fs.stat(path.join(root, url), function (err, stat) {
        if (err) return next();

        if (stat.isDirectory()) {
          if (url[url.length - 1] === "/") {
            url = path.join("./", url, index);
            const html = injectScript(fs.readFileSync(path.join(root, url)));
            return sendHtmlContent(res, html);
          } else {
            return res.redirect(url + "/");
          }
        }

        if (extensions.indexOf(path.extname(url).substr(1)) > -1) {
          const html = injectScript(fs.readFileSync(path.join(root, url)));
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
  socket = socket || new http.Server();

  webReload.clients = [];

  SocketIOServer(socket, {
    path: "/__webreload/sockets"
  }).on("connection", (client) => {
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
  webReload.clients && webReload.clients.forEach((client) => client.emit("reload"));
};

module.exports = webReload;
