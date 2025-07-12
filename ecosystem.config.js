module.exports = {
  apps: [{
    name: 'telegram-bot', // Имя процесса, которое мы видели в pm2 status
    script: 'index.js',    // Правильное имя вашего главного файла
  }],

  // Секция deploy нам больше не нужна, но можно её оставить или удалить.
  // Главное, что apps-секция настроена верно.
  deploy: {
    production: {
      user: 'admin',
      host: 'ssh.smakuie.com',
      ref: 'origin/master',
      repo: 'git@github.com:Vladkvarta/bot.git',
      path: '~/telegram-app',
      'post-deploy': 'npm install && /home/admin/.nvm/versions/node/v22.17.0/bin/pm2 reload telegram-bot'
    }
  }
};