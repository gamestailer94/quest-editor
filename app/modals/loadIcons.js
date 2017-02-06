(function ($) {
  const ipc = require('electron').ipcRenderer
  ipc.send('getIconsPath')

  ipc.on('loadIcons', function (event, path) {
    fs.readFile(path, function (err, read) {
      let icons = read.toString('base64')
      ipc.send('returnIcons', icons)
    })
  })
})(jQuery)
