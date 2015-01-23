require('es6-shim');
global.Basis = require('../build');
require('repl').start({prompt: 'basis> ', terminal: false, useGlobal: true});
