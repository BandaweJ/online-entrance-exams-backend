import { Injectable } from "@nestjs/common";
import { CreateErrorLogDto } from "./dto/create-error-log.dto";

@Injectable()
export class LogsService {
  createErrorLog(createErrorLogDto: CreateErrorLogDto) {
    // In a real application, you would save this to a database
    // For now, just log to console
    console.log("Error logged:", {
      ...createErrorLogDto,
      timestamp: new Date(createErrorLogDto.timestamp),
    });

    return { message: "Error logged successfully" };
  }
}
