require('es6-shim');
global.Transis = require('../dist');
require('repl').start({prompt: 'transis> ', terminal: false, useGlobal: true});
