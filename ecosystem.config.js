module.exports = {
  // Настройки вашего приложения
  apps: [{
    name: 'app.js',
    script: 'index.js', // Убедитесь, что имя файла верное (у вас это index.js)
  }],

  // Настройки развертывания
  deploy: {
    production: {
      user: 'admin',
      host: 'ssh.smakuie.com', // Адрес для SSH, который мы настроили
      ref: 'origin/master', // Ветка в Git
      repo: 'git@github.com:Vladkvarta/bot.git', // ВАЖНО: SSH-URL вашего репозитория
      path: '~/telegram-app', // Папка на Orange Pi

      // Команды после загрузки нового кода
      'post-deploy': 'npm install && /home/admin/.nvm/versions/node/v22.17.0/bin/pm2 reload ecosystem.config.js --env production'
    }
  }
};