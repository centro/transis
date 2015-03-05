require('es6-shim');
global.Basis = require('../dist');
require('repl').start({prompt: 'basis> ', terminal: false, useGlobal: true});
