(function ($) {
  const ipc = require('electron').ipcRenderer
  const fs = require('fs')
  ipc.send('getIconsPath')

  ipc.on('loadIcons', function (event, path) {
    fs.readFile(path, function (err, read) {
      err = null
      let icons = read.toString('base64')
      ipc.send('returnIcons', icons)
    })
  })
})(jQuery)
