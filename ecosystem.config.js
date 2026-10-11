module.exports = {
  apps: [{
    name: 'kafka',
    script: 'src/index.js',
    cwd: '/mnt/disk2-part1/codings/kafkaBot',
    error_file: '/mnt/disk2-part1/codings/kafkaBot/logs/err.log',
    out_file: '/mnt/disk2-part1/codings/kafkaBot/logs/out.log',
    watch: ['src'],
    watch_delay: 1500,
    ignore_watch: ['node_modules', 'logs', '*.log'],
    env: { NODE_ENV: 'production', DOTENV_QUIET: 'true' }
  }]
};
