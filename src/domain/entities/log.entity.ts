export enum LogSeverityLevel {
  low = "low",
  medium = "medium",
  high = "high",
}

export interface LogEntityOptions {
  message: string;
  level: LogSeverityLevel;
  origin: string;
  createdAt?: Date;
}

export class LogEntity {
  public level: LogSeverityLevel; // Enum
  public message: string;
  public createdAt: Date;
  public origin: string;

  constructor(options: LogEntityOptions) {
    const { level, message, origin, createdAt = new Date() } = options;
    this.message = message;
    this.level = level;
    this.createdAt = createdAt;
    this.origin = origin;
  }

  static fromJson(json: string): LogEntity {

    json = (json === '') ? '{}' : json;

    const { message, level, origin, createdAt } = JSON.parse(json);
    const log = new LogEntity({
      message,
      level,
      origin,
      createdAt: new Date(createdAt)
    });
    return log;
  }

   static fromObject(obj: Record<string, any>): LogEntity {
    const { message, level, origin, createdAt } = obj;

    const log = new LogEntity({
      message,
      level,
      origin,
      createdAt,
    });

    return log;
  }
}
