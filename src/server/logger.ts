import { Connection } from 'vscode-languageserver/node';

export class Logger {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  // Gets a timestamp string in ISO format
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Logs an informational message
   */
  public info(msg: string): void {
    this.connection.console.info(`[INFO][${this.getTimestamp()}] ${msg}`);
  }

  /**
   * Logs a standard log message
   */
  public log(msg: string): void {
    this.connection.console.log(`[LOG][${this.getTimestamp()}] ${msg}`);
  }

  /**
   * Logs a warning message
   */
  public warn(msg: string): void {
    this.connection.console.warn(`[WARN][${this.getTimestamp()}] ${msg}`);
  }

  /**
   * Logs an error message
   */
  public error(msg: string): void {
    this.connection.console.error(`[ERROR][${this.getTimestamp()}] ${msg}`);
  }
} 