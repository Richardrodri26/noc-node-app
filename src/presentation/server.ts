import { LogSeverityLevel } from "../domain/entities/log.entity";
import { CheckService } from "../domain/use-cases/checks/check-service";
import { CheckServiceMultiple } from "../domain/use-cases/checks/check-service-multiple";
import { SendEmailLogs } from "../domain/use-cases/email/send-email-logs";
import { FileSystemDatasource } from "../infrastructure/datasources/file-system.datasource";
import { MongoLogDatasource } from "../infrastructure/datasources/mongo-log.datasource";
import { PostgresLogDatasource } from "../infrastructure/datasources/postgres-log.datasource";
import { LogRepositoryImpl } from "../infrastructure/repositories/log.repository.impl";
import { CronService } from "./cron/cron-service";
import { EmailService } from "./email/email.service";



const fsLogRepository = new LogRepositoryImpl(
  new FileSystemDatasource()
);
const mongoLogRepository = new LogRepositoryImpl(
  new MongoLogDatasource()
);
const postgresLogRepository = new LogRepositoryImpl(
  new PostgresLogDatasource()
);

const emailService = new EmailService();

export class Server {
  public static async start() {
    console.log("Server started...");

    // new SendEmailLogs(emailService, logRepository).execute(['richardmanuel26@hotmail.com']);

    // emailService.sendEmail({
    //   to: 'richardmanuel26@hotmail.com',
    //   subject: 'Logs del sistema',
    //   htmlBody: `
    //     <h3>Logs del sistema</h3>
    //   `
    // })

    // const data = emailService.sendEmailWithFileSystemLogs('richardmanuel811@gmail.com');


    // const logs = await logRepository.getLogs(LogSeverityLevel.low)

    // console.log('logs', logs)

    CronService.createJob("*/5 * * * * *", () => {

      const url = "https://www.google.com"

      new CheckServiceMultiple(
        [fsLogRepository, mongoLogRepository, postgresLogRepository],
        () => console.log(`${url} is ok`),
        (error) => console.log(`Check service error: ${error}`)
      ).execute(url)
      // new CheckService().execute("http://localhost:3000/posts")
    });

  }
}
