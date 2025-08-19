import type { LogDatasource } from "../../domain/datasources/log.datasource";
import type { LogEntity, LogSeverityLevel } from "../../domain/entities/log.entity";
import fs from "node:fs"


export class FileSystemDatasource implements LogDatasource {

  private readonly logPath = "logs/";
  private readonly allLogsPath = "logs/logs-low.log";
  private readonly mediumLogsPath = "logs/logs-medium.log";
  private readonly highLogsPath = "logs/logs-high.log";

  constructor() {
    this.createLogsFiles();
  }

  private createLogsFiles = () => {

    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath);
    }

    [
      this.allLogsPath,
      this.mediumLogsPath,
      this.highLogsPath
    ].forEach(path => {
      if (fs.existsSync(path)) return;

    fs.writeFileSync(path, "");
    })

  }

  saveLog(log: LogEntity): Promise<void> {
    throw new Error("Method not implemented.");
  }
  getLogs(severityLevel: LogSeverityLevel): Promise<LogEntity[]> {
    throw new Error("Method not implemented.");
  }

}