global.Ryno = require('../build');
require('repl').start({prompt: 'ryno> ', terminal: false, useGlobal: true});
