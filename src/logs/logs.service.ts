import { Injectable } from "@nestjs/common";
import { CreateErrorLogDto } from "./dto/create-error-log.dto";

@Injectable()
export class LogsService {
  createErrorLog(createErrorLogDto: CreateErrorLogDto) {
    // In a real application, you would save this to a database
    // Log error to database
    const errorLog = {
      ...createErrorLogDto,
      timestamp: new Date(createErrorLogDto.timestamp),
    };

    return { message: "Error logged successfully" };
  }
}
