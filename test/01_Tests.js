/* eslint-env mocha */
'use strict'
let Application = require('spectron').Application
var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
var path = require('path')
var fs = require('fs')

chai.should()
chai.use(chaiAsPromised)

describe('QuestEditor', function () {
  this.timeout(300000)

  this.slow(60000)

  var App = new Application({
    path: require('electron'),
    args: [path.join(__dirname, '../app')]
  })

  before(function () {
    return App.start()
  })

  beforeEach(function () {
    chaiAsPromised.transferPromiseness = App.transferPromiseness
  })

  after(function () {
    if (App && App.isRunning()) {
      return App.stop()
    }
  })

  it('should start', function () {
    return App.client.waitUntilWindowLoaded()
      .getWindowCount().should.eventually.equal(1)
      .browserWindow.isMinimized().should.eventually.be.false
      .browserWindow.isDevToolsOpened().should.eventually.be.false
      .browserWindow.isVisible().should.eventually.be.true
      .browserWindow.getBounds().should.eventually.have.property('width').and.be.above(0)
      .browserWindow.getBounds().should.eventually.have.property('height').and.be.above(0)
  })

  describe('Main Window', function () {
    this.slow(4000)

    it('should have nav elements', function () {
      return App.client.waitUntilWindowLoaded()
        .isVisible('#bottom-bar').should.eventually.be.true
    })

    it('should have no folder warning', function () {
      return App.client.localStorage('DELETE').then(function () {
        return App.client.refresh()
          .waitForExist('#noFolder').should.eventually.be.true
          .isVisible('#noFolder').should.eventually.be.true
      })
    })

    it('should have wrong folder warning', function () {
      return App.client.localStorage('POST', {'key': 'projectFolder', 'value': 'foo'}).then(function () {
        return App.client.refresh()
          .waitForExist('#wrongFolder').should.eventually.be.true
          .isVisible('#wrongFolder').should.eventually.be.true
      })
    })

    it('should have Quests Overview with 1+ elements', function () {
      let projectDir = path.join(__dirname, 'files')
      let newPlugin = fs.readFileSync(path.join(__dirname, '../app/res/GS_QuestSystem.js'))
      fs.writeFileSync(path.join(projectDir, '/js/plugins/GS_QuestSystem.js'), newPlugin)

      return App.client.localStorage('POST', {'key': 'projectFolder', 'value': projectDir}).then(function () {
        return App.client.refresh()
          .waitForExist('#quests').should.eventually.be.true
          .isVisible('#quests').should.eventually.be.true
          .$$('#quests > .panel').should.eventually.have.length.above(1)
      })
    })

    it('should have steps', function () {
      return App.client.isExisting('#quests > .panel .bodySteps').should.eventually.be.true
    })

    it('should have rewards', function () {
      return App.client.isExisting('#quests > .panel .bodyRewards').should.eventually.be.true
    })
  })
})
