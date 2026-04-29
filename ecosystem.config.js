module.exports = {
  apps: [{
    name:        'kafka',
    script:      'src/index.js',
    cwd:         '/mnt/disk2-part1/codings/kafkaBot',
    watch:       ['src'],
    watch_delay: 1500,
    ignore_watch: ['node_modules', 'logs', '*.log'],
    env: { NODE_ENV: 'production' }
  }]
};
