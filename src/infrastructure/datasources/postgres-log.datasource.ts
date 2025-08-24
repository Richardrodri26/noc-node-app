import { LogDatasource } from "../../domain/datasources/log.datasource";
import { LogEntity, LogSeverityLevel } from "../../domain/entities/log.entity";
import { PrismaClient, SeverityLevel } from "../../generated/prisma/client";

const prismaClient = new PrismaClient();

const severityEnum = {
  low: SeverityLevel.LOW,
  medium: SeverityLevel.MEDIUM,
  high: SeverityLevel.HIGH
}

export class PostgresLogDatasource implements LogDatasource {
  async saveLog(log: LogEntity): Promise<void> {

    const level = severityEnum[log.level];

    const newLog = await prismaClient.logModel.create({
      data: {
        ...log,
          level
      }
    });

    console.log("Log saved:", newLog);

  }
  async getLogs(severityLevel: LogSeverityLevel): Promise<LogEntity[]> {
      const level = severityEnum[severityLevel];
      
      const dbLogs = await prismaClient.logModel.findMany({
          where: {
              level
          }
      });

      return dbLogs.map(dbLog => LogEntity.fromObject(dbLog));
  }

}