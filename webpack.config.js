var webpack = require('webpack')

var ignore = new webpack.IgnorePlugin(/^vm$/);

/**
 * @see http://webpack.github.io/docs/configuration.html
 * for webpack configuration options
 */
module.exports = {
  context: __dirname + '/src',

  plugins: [ignore],

  entry: './index.js',

  output:  {
    library: 'Basis',
    libraryTarget: 'umd'
  },

  module: {
    loaders: [
      {test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'}
    ]
  }
};
