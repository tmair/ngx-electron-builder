const npsUtils = require('nps-utils');
const fs = require('fs');

module.exports = {
  scripts: {
    default: npsUtils.series.nps('build'),
    'copy-package-data': npsUtils.copy('README.md LICENCE CHANGELOG.md builders.json package.json dist'),
    tsc: 'tsc',
    clean: npsUtils.rimraf('dist'),
    build: {
      script: npsUtils.series.nps('format', 'tsc')
    },
    format: 'prettier --write src/**/*.ts',
    'build-dist': npsUtils.concurrent.nps('copy-package-data', 'build'),

    release: {
      script: npsUtils.series.nps('clean', 'build-dist', 'standard-version')
    }
  }
};
