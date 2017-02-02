#!/usr/bin/env bash

if [[ "$TRAVIS_OS_NAME" == "linux" ]]
then
  export DISPLAY=:99.0
  sh -e /etc/init.d/xvfb start
  sleep 3
fi

if [[ "$TRAVIS_TAG" ]]
then
    echo "Tag set, do not Build. see https://github.com/electron-userland/electron-builder/issues/429"
else
    npm run test && npm run standard && npm run dist
fi