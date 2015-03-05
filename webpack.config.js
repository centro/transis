/**
 * @see http://webpack.github.io/docs/configuration.html
 * for webpack configuration options
 */
module.exports = {
  context: __dirname + '/src',

  entry: './index.js',

  module: {
    loaders: [
      {test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'}
    ]
  }
};
