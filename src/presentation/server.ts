import { CheckService } from "../domain/use-cases/checks/check-service";
import { FileSystemDatasource } from "../infrastructure/datasources/file-system.datasource";
import { LogRepositoryImpl } from "../infrastructure/repositories/log.repository.impl";
import { CronService } from "./cron/cron-service";
import { EmailService } from "./email/email.service";

const fileSystemLogRepository = new LogRepositoryImpl(
  new FileSystemDatasource()
)

export class Server {
  public static start() {
    console.log("Server started...");

    // const emailService = new EmailService();

    // emailService.sendEmail({
    //   to: 'richardmanuel26@hotmail.com',
    //   subject: 'Logs del sistema',
    //   htmlBody: `
    //     <h3>Logs del sistema</h3>
    //   `
    // })

    // CronService.createJob("*/5 * * * * *", () => {

    //   const url = "https://www.google.com"

    //   new CheckService(
    //     fileSystemLogRepository,
    //     () => console.log(`${url} is ok`),
    //     (error) => console.log(`Check service error: ${error}`)
    //   ).execute(url)
    //   // new CheckService().execute("http://localhost:3000/posts")
    // });

  }
}
