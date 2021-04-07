const Generator = require('yeoman-generator');
const keyPair = require('../../lib/certificate-creator/rsa-certificate-creator').keyPair;
const path = require('path');

const BDK_VERSION_DEFAULT = '2.0b1';
const COMMON_EXT_APP_TEMPLATES = '../../../common-template/circle-of-trust-ext-app'

const KEY_PAIR_LENGTH = 'KEY_PAIR_LENGTH';

module.exports = class extends Generator {

  async writing() {
    this.answers = this.options;

    this.answers.bdkVersion = BDK_VERSION_DEFAULT;

    try {
      this.log('Generating RSA keys...'.green.bold);
      this.pair = keyPair(this.config.get(KEY_PAIR_LENGTH) || 4096);
      this.fs.write(this.destinationPath('rsa/publickey.pem'), this.pair.public, err => this.log.error(err));
      this.fs.write(this.destinationPath('rsa/privatekey.pem'), this.pair.private, err => this.log.error(err));
      this.answers.privateKeyPath = 'rsa/privatekey.pem';
    } catch (e) {
      this.log.error(`Oups, something went wrong when generating RSA key pair`, e);
    }

    [
      ['requirements.txt.ejs', 'requirements.txt'],
      ['logging.conf.ejs', 'logging.conf'],
      ['.gitignore.tpl', '.gitignore']
    ].forEach(path_pair => {
      this.fs.copyTpl(
        this.templatePath(path_pair[0]),
        this.destinationPath(path_pair[1]),
        this.answers
      )
    });

    if (this.answers.application === 'bot-app') {
      [
        ['bot-app/config.yaml.ejs', 'resources/config.yaml'],
        ['bot-app/main.py.ejs', 'python/main.py']
      ].forEach(path_pair => {
        this.fs.copyTpl(
          this.templatePath(path_pair[0]),
          this.destinationPath(path_pair[1]),
          this.answers
        )
      });
    }
    if (this.answers.application === 'ext-app') {
      [
        ['ext-app/config.yaml.ejs', 'resources/config.yaml'],
        ['ext-app/srv.crt', 'resources/srv.crt'],
        ['ext-app/srv.key', 'resources/srv.key'],
        ['ext-app/main.py.ejs', 'python/main.py'],
        ['ext-app/ext_app_be.py.ejs', 'python/ext_app_be.py']
      ].forEach(path_pair => {
        this.fs.copyTpl(
          this.templatePath(path_pair[0]),
          this.destinationPath(path_pair[1]),
          this.answers
        )
      });

      // Process application.yaml.ejs file
      this.fs.copyTpl(
        this.templatePath('ext-app/config.yaml.ejs'),
        this.destinationPath('resources/config.yaml'),
        this.answers
      );

      // Process scripts files
      ['app.js', 'controller.js'].forEach(file => {
        this.fs.copyTpl(
          this.templatePath(path.join(COMMON_EXT_APP_TEMPLATES, 'scripts', file + '.ejs')),
          this.destinationPath(path.join('resources/static/scripts', file)),
          this.answers
        );
      });

      this.fs.copyTpl(
        this.templatePath(path.join(COMMON_EXT_APP_TEMPLATES, 'static')),
        this.destinationPath('resources/static'),
      );
    }
  }

  end() {
    if (this.pair) {
      this.log('\nYou can now update the service account '.cyan +
        `${this.answers.username}`.white.bold +
        ` with the following public key on https://${this.answers.host}/admin-console : `.cyan);

      this.log('\n' + this.pair.public);
    }

    this.log(`Your Python project has been successfully generated !`.cyan.bold);
    this.log(`Install all required packages with: `.cyan.bold + `pip3 install -r requirements.txt`);
    this.log(`And run your bot with: `.cyan.bold + `python3 python/main.py`);
  }
}
