/* eslint-env mocha */
var Application = require('spectron').Application
var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
var path = require('path')
var electronPath = require('electron')

chai.should()
chai.use(chaiAsPromised)

describe('application launch', function () {
this.timeout(0)
  beforeEach(function () {
    this.App = new Application({
      path: electronPath,
      args: [path.join(__dirname, '../app')],
      chromeDriverLogPath: 'test.log'
    })
    chaiAsPromised.transferPromiseness = this.App.transferPromiseness
    return this.App.start()
  })


  afterEach(function () {
    if (this.App && this.App.isRunning()) {
      return this.App.stop()
    }
  })

  it('opens a window', function () {
    return this.App.client.waitUntilWindowLoaded()
      .getWindowCount().should.eventually.equal(1)
      .browserWindow.isMinimized().should.eventually.be.false
      .browserWindow.isDevToolsOpened().should.eventually.be.false
      .browserWindow.isVisible().should.eventually.be.true
      .browserWindow.getBounds().should.eventually.have.property('width').and.be.above(0)
      .browserWindow.getBounds().should.eventually.have.property('height').and.be.above(0)
  })
})
