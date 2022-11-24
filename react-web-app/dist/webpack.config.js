var path = require('path');
module.exports = {
    entry: './webstart.ts',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /(node_modules|tests)/,
            },
        ],
    },
    devtool: 'inline-source-map',
    externals: {
        wabt: 'wabt',
        axios: 'axios'
    },
    resolve: {
        extensions: ['.ts'],
        aliasFields: ['browser', 'browser.esm']
    },
    output: {
        path: path.resolve(__dirname, "build"),
        filename: 'webstart.js'
    },
};
//# sourceMappingURL=webpack.config.js.map