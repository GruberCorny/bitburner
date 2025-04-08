// logger.js

export class Logger {
  constructor(ns, logLevel = 'info') {
    this.ns = ns;
    this.logLevel = logLevel;
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.logLevel = level;
    } else {
      this.error(`Invalid log level: ${level}`);
    }
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  log(level, message) {
    if (this.logLevels[level] <= this.logLevels[this.logLevel]) {
      const formattedMessage = this.formatMessage(level, message);
      this.ns.print(formattedMessage);
      
      // You can also write to a file if needed
      // this.ns.write('log.txt', formattedMessage + '\n', 'a');
    }
  }

  error(message) {
    this.log('error', message);
  }

  warn(message) {
    this.log('warn', message);
  }

  info(message) {
    this.log('info', message);
  }

  debug(message) {
    this.log('debug', message);
  }
}

// Usage example:
// import { Logger } from './logger.js';
// const logger = new Logger(ns, 'info');
// logger.info('This is an info message');
// logger.debug('This is a debug message');
// logger.setLogLevel('debug');
// logger.debug('This debug message will now be shown');