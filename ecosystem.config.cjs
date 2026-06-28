module.exports = {
  apps: [
    {
      name: 'unimanager-backend',
      script: 'npm',
      args: 'run start',
      cwd: './backend',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'unimanager-frontend',
      script: 'npm',
      args: 'run preview -- --port 5173 --host',
      cwd: './frontend',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
