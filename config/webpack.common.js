const path = require('path')
const pkgJSON = require('../package.json')

config = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'static/js/[name].[hash].js',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.(html)$/,
        use: {
          loader: 'html-loader'
        }
      },
      {
        test: /\.js$/,
        // exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 2000,
              name: '[name].[hash].[ext]',
              outputPath: 'static/images/'
            }
          }
        ]
      }
    ]
  },
  plugins: [],
  devServer: {
    contentBase: path.join(__dirname),
    compress: true,
    port: 3000,
    host: '0.0.0.0',
    disableHostCheck: true
  },
  performance: {
    maxAssetSize: 99999999
  }
}

if (pkgJSON.dependencies.hasOwnProperty('vue')) {
  const VueLoader = require('vue-loader/lib/plugin')
  config.module.rules = config.module.rules.concat([
    {
      test: /.vue$/,
      loader: 'vue-loader'
    },
    {
      test: /\.less$/,
      use: ['vue-style-loader', 'css-loader', 'less-loader']
    }
  ])
  config.plugins = [new VueLoader()]
} else {
  config.module.rules.push({
    test: /\.less$/,
    use: ['css-loader', 'less-loader']
  })
}

module.exports = config
