module.exports = {
  apps: [{
    name: 'telegram-bot', // Имя процесса, которое мы видели в pm2 status
    script: 'index.js',    // Правильное имя вашего главного файла
  }]
};