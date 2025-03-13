export class ErrorDto {
  message: string;
  statusCode: number;
}

export class SuccessDto {
  success: boolean;
}

export class PageDto {
  total: number;
  page: number;
  limit: number;
}

export class ListDto {
  total: number;
}
