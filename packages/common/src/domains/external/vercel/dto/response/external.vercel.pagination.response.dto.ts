export class ExternalVercelPaginationResponseDto {
  readonly pagination: {
    readonly count: number;
    readonly next: number | null;
    readonly prev: number;
  };
}
