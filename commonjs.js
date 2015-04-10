var require = (function (global, evalText) {
  'use strict';
  
  var config = global.require || {};
  
  var loadingText = {};
  var loadingModules = {};
  var moduleInstances = {};
  
  var currentUrl = config.baseUrl + '/'
      || location.href;
  
  var normalizerEl = document.createElement('a');
  function normalizeUrl(url) {
    normalizerEl.href = url;
    return normalizerEl.href;
  }
  
  function getUrlFromModuleName(baseUrl, modName) {
    if (/^(?:[a-z]+:)?\/\//.test(modName)) {
      return normalizeUrl(modName + '.js');
    } else {
      baseUrl = normalizeUrl(baseUrl);
      var url = (modName.charAt(0) === '/')
          ? baseUrl.match(/[^/]*\/\/[^/]*/)[0]
          : baseUrl
              .replace(/[?#].*/, '')
              .replace(/\/[^/]*$/, '');
      var urlSegments = url.split(/\//g);
      var modNameSegments = modName.split(/\//g);
      modNameSegments.forEach(function (seg) {
        if (seg === '.') {
          return;
        } else if (seg === '..') {
          if (urlSegments.length > 3) {
            urlSegments.pop();
          }
        } else {
          urlSegments.push(seg);
        }
      });
      return urlSegments.join('/') + '.js';
    }
  }
  
  function getRequiredModuleNames(moduleText) {
    var regex = /\brequire\s*\(\s*(['"])([^'"]*)\1\)/g;
    var reqModNames = [];
    
    var match;
    while (match = regex.exec(moduleText)) {
      reqModNames.push(match[2]);
    }
    
    return reqModNames;
  }
  
  function buildContextFromModuleText(moduleText, baseUrl) {
    var constructingEachModule = getRequiredModuleNames(moduleText)
        .map(function (modName) {
          return getUrlFromModuleName(baseUrl, modName);
        })
        .map(constructModuleFromUrl);
    return Promise.all(constructingEachModule);
  }
  
  function constructModuleFromUrl(modUrl) {
    if (!loadingModules[modUrl]) {
      var modText = null;
      
      loadingModules[modUrl] = loadModuleTextFromUrl(modUrl)
          .then(function (text) {
            modText = text;
            return buildContextFromModuleText(text, modUrl);
          })
          .then(function () {
            var origUrl = currentUrl;
            currentUrl = modUrl;
            try {
              var modInstance = evalText(modUrl, modText);
              moduleInstances[modUrl] = modInstance;
            } finally {
              currentUrl = origUrl;
            }
          });
    }
    
    return loadingModules[modUrl];
  }
  
  function loadModuleTextFromUrl(modUrl) {
    var loading = loadingText[modUrl];
    if (!loading) {
      loading = loadingText[modUrl] = new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.responseText);
        };
        xhr.onerror = reject;
        xhr.open('get', modUrl, true);
        xhr.send();
      });
    }
    return loading;
  }
  
  function require(/*args*/) {
    var type = typeof arguments[0];
    if (type === 'string') {
      var modName = arguments[0];
      var url = getUrlFromModuleName(currentUrl, modName);
      if (url in moduleInstances) {
        return moduleInstances[url];
      } else {
        throw 'require(' + JSON.stringify(modName) + ') not found';
      }
    } else if (type === 'function') {
      var callback = arguments[0];
      var moduleText = callback.toString();
      var buildingContext = buildContextFromModuleText(moduleText, currentUrl);
      buildingContext.then(callback);
    }
  }
  
  require.config = config;
  
  return require;
  
}((0,eval)('this'), function evalText(modUrl, modText) {
  var exports = {};
  var module = {};
  Object.defineProperty(module, 'exports', {
    enumerable : true,
    configurable : false,
    get : function () {
      return exports;
    },
    set : function (newVal) {
      exports = newVal;
      return newVal;
    },
  });
  
  eval(modText + '\n//# sourceURL=' + modUrl);
  
  return exports;
}));
