var io = window.io;

document.addEventListener("readystatechange", function () {
  if (document.readyState === "complete") {
    init();
  }
});

function init() {
  var socket = io(location.host, {
    path: "/__webreload/sockets"
  });

  socket
    .on("connect", function () {
      console.log("WebReload connected");
    })
    .on("reconnect", reloadPage)
    .on("reload", reloadPage);

  function reloadPage() {
    console.log("WebReload reloading page...");
    window.location.reload();
  }
}
