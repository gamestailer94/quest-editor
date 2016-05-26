const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const ipc = electron.ipcMain;
const dialog = electron.dialog;
const clipboard = electron.clipboard;
const autoUpdater = electron.autoUpdater;
const os = require('os');
const path = require('path');
const categoriesModalPath = path.join('file://', __dirname, 'modals/categories.html');
const iconModalPath = path.join('file://', __dirname, 'modals/icons.html');
const setMaxPath = path.join('file://', __dirname, 'modals/setMax.html');
const debug = false;


//Squirrle Events Handeling

// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}

function handleSquirrelEvent() {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
        } catch (error) {}

        return spawnedProcess;
    };

    const spawnUpdate = function(args) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            // Optionally do things such as:
            // - Add your .exe to the PATH
            // - Write to the registry for things like file associations and
            //   explorer context menus

            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers

            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated

            app.quit();
            return true;
    }
}

//Auto Update Handling

var platform = os.platform() + '_' + os.arch();
var version = app.getVersion();

autoUpdater.setFeedURL('https://quest.gamestailer94.de/update/'+platform+'/'+version);
 try {
    autoUpdater.checkForUpdates();
} catch(error){
    //looks like app is not installed, skip update check.
}
autoUpdater.on('update-downloaded', function(){
    const options = {
        type: 'question',
        title: 'Update',
        message: "A newer Version of this Editor and JS Plugin is available, do you want to close and update?",
        buttons: ['Yes', 'No'],
        defaultId: 0
    };
    dialog.showMessageBox(options, function (index) {

        if(index == 0) {
            autoUpdater.quitAndInstall();
        }
    });
});



//Windows and other persistent stuff

let categoriesWin;
let IconWin;
let setMaxWin;
let iconId;
let icons;
let quests;
let newMax;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;


let menuTemplate = [{
    label: 'File',
    submenu: [{
        label: 'Set Project Directory',
        click: showProjectDirDialog
    },{
        label: 'Reload Quests',
        click: reloadQuests
    }]
},{
    label: "Help",
    submenu: [{
        label: 'About',
        click: displayAbout
    }]
}
];

function createWindow () {
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/index.html`);

    // Open the DevTools.
    if(debug) mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipc.on('setProjectDirectory',showProjectDirDialog);

ipc.on('getCategories', function(){
    mainWindow.webContents.send('getCategories');
});

ipc.on('sendCategories', function (event, data) {
   categoriesWin.webContents.send('sendCategories', data);
});

ipc.on('openCategories', openCategoriesWindow);
ipc.on('saveCategories', function(events, data){
    mainWindow.webContents.send('saveCategories', data);
    categoriesWin.close();
});

ipc.on('openIconWindow', openIconWindow);

ipc.on('saveIcon', function(event, id, iconId){
    mainWindow.webContents.send('saveIcon', id, iconId);
    IconWin.close();
});

ipc.on('getIcons', function(){
    IconWin.webContents.send('setIconId', iconId, icons);
});

ipc.on('setMax', setMax);

ipc.on('getMax', function(){
   setMaxWin.webContents.send('setMax', quests, newMax);
});

ipc.on('updateMaxProgress', function(event, progress){
    mainWindow.webContents.send('updateMaxProgress', progress)
});

ipc.on('returnMax', function(event, newQuests){
    mainWindow.webContents.send('returnMax', newQuests);
    setMaxWin.close();
});

ipc.on('updatePluginDialog', function(event){
    const options = {
        type: 'question',
        title: 'Update JS Plugin',
        message: "Update JS Plugin",
        detail: "The Plugin Version in the Project is different then the one included in the Editor.\nUpdate it?",
        buttons: ['Yes', 'No'],
        defaultId: 0
    };
    dialog.showMessageBox(options, function (index) {
        event.sender.send('updatePluginDialogReturn', index)
    })
});

ipc.on('installPluginDialog', function(event){
    const options = {
        type: 'question',
        title: 'Install JS Plugin',
        message: "No Plugin JS found!",
        detail: "Install the included one?\nRemember to active it.",
        buttons: ['Yes', 'No'],
        defaultId: 0
    };
    dialog.showMessageBox(options, function (index) {
        event.sender.send('installPluginDialogReturn', index)
    })
});

ipc.on('replacePluginDialog', function(event){
    const options = {
        type: 'question',
        title: 'Replace JS Plugin',
        message: "Gameus Quest System JS Plugin Found.",
        detail: "It seems that you use the Gameus Quest System JS Plugin.\nDo you want to Replace it with the included Version of GS Quest System?\nThis WILL reset you Plugin settings, but not your Quests.\nRemember to active it.",
        buttons: ['Yes', 'No'],
        defaultId: 0
    };
    dialog.showMessageBox(options, function (index) {
        event.sender.send('replacePluginDialogReturn', index)
    })
});

ipc.on('showError', function (event, stack) {
    clipboard.writeText(stack);
    dialog.showErrorBox('Error', 'Please Report this Error in GitHub or at the Forums Topic.\nThis Error has been Copied to your Clipboard.\nThe Application will now exit.\n\nTrace:\n\n'+stack);
    if(!debug){
        mainWindow.close();
        app.quit();
    }
});


function displayAbout(){
    const options = {
        type: 'info',
        title: 'About',
        message: "Abut this Editor and the JS Plugin",
        detail: "Version: "+app.getVersion()+"\nThis Editor has been Made by: gamestailer94\nFixes and addition Features for the JS Plugin by: gamestailer94\nProgram Icon by: BlueDragon\nData Format and original JS Plugin by: gameus",
        buttons: ['Close'],
        defaultId: 0
    };
    dialog.showMessageBox(options, function (index){});
}

function showProjectDirDialog(event){
    dialog.showOpenDialog({
        properties: ['openDirectory']
    },function(dir){
        if (dir) mainWindow.webContents.send('setProjectDirectory', dir)
    });
}

function reloadQuests(){
    mainWindow.webContents.send('reloadQuests');
}

function openCategoriesWindow(){
    categoriesWin = new BrowserWindow({ width: 400, height: 320 });
    categoriesWin.on('closed', function () { categoriesWin = null });
    categoriesWin.loadURL(categoriesModalPath);
    categoriesWin.setMenuBarVisibility(false);
    categoriesWin.show();
    if (debug) categoriesWin.webContents.openDevTools();
}

function openIconWindow(event, id, Icons){
    iconId = id;
    icons = Icons;
    IconWin = new BrowserWindow({ width: 700, height: 400 });
    IconWin.on('closed', function () { IconWin = null });
    IconWin.loadURL(iconModalPath);
    IconWin.setMenuBarVisibility(false);
    IconWin.show();
    if (debug) IconWin.webContents.openDevTools();
}

function setMax(event, Quests, NewMax){
    quests = Quests;
    newMax = NewMax;
    setMaxWin = new BrowserWindow({show: false ,width: 400, height: 320});
    setMaxWin.on('closed', function () { setMaxWin = null });
    setMaxWin.loadURL(setMaxPath);
}
