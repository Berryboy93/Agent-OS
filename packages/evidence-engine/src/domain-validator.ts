import type {
  ChangeRequest,
  DomainValidationResult,
} from "./governance.js";

export interface DomainValidatorContext {
  readonly changeRequest: ChangeRequest;
  readonly workspaceRoot: string;
  readonly environment: Record<string, string | undefined>;
  readonly signal?: AbortSignal;
}

export interface DomainValidator {
  readonly id: string;
  readonly version: string;
  readonly surfaces: readonly string[];

  validate(
    context: DomainValidatorContext,
  ): Promise<DomainValidationResult>;
}

export class DomainValidatorRegistry {
  private readonly validators = new Map<string, DomainValidator>();

  register(validator: DomainValidator): void {
    if (this.validators.has(validator.id)) {
      throw new Error(`Duplicate domain validator: ${validator.id}`);
    }
    this.validators.set(validator.id, validator);
  }

  get(id: string): DomainValidator | undefined {
    return this.validators.get(id);
  }

  forSurfaces(surfaces: readonly string[]): readonly DomainValidator[] {
    const requested = new Set(surfaces);
    return [...this.validators.values()].filter((validator) =>
      validator.surfaces.some((surface) => requested.has(surface)),
    );
  }

  list(): readonly DomainValidator[] {
    return [...this.validators.values()];
  }
}
