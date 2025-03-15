import { Injectable } from "@nestjs/common";

@Injectable()
export class TimeFormatterService {
  formatDateTime(isoString: string): string {
    const date = new Date(isoString);

    // Use Intl.DateTimeFormat for consistent formatting
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });

    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;
  }
}
