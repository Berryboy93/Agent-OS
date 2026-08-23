export interface ApprovalHandler<Options = unknown, Result = unknown> {
  (options: Options): Promise<Result>;
}

export interface RejectionHandler<Options = unknown, Result = unknown> {
  (options: Options): Promise<Result>;
}
