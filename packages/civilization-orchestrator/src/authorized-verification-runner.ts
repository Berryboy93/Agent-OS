import {
  CapabilityManager,
  type AgentProfile,
} from '@agi-ecosystem/agent-os-runtime';

import {
  getTrustedVerificationProfiles,
  type TrustedVerificationProfileId,
} from './verification-profiles.js';

import {
  VerificationRunner,
  type VerificationExecution,
} from './verification-runner.js';

export const VERIFICATION_EXECUTOR = 'verification-runner';
export const VERIFICATION_RESOURCE = 'verification';
export const VERIFICATION_ACTION = 'execute';

export interface AuthorizedVerificationRunnerConfig {
  readonly repositoryRoot: string;
  readonly agentId: string;
  readonly capabilityManager: CapabilityManager;
}

export class AuthorizedVerificationRunner {
  private readonly agentId: string;
  private readonly capabilityManager: CapabilityManager;
  private readonly runner: VerificationRunner;
  private readonly profiles: ReturnType<typeof getTrustedVerificationProfiles>;

  constructor(config: AuthorizedVerificationRunnerConfig) {
    this.agentId = config.agentId;
    this.capabilityManager = config.capabilityManager;
    this.profiles = getTrustedVerificationProfiles(
      config.repositoryRoot,
    );
    this.runner = new VerificationRunner({
      repositoryRoot: config.repositoryRoot,
      profiles: this.profiles,
    });
  }

  async run(
    profileId: TrustedVerificationProfileId,
  ): Promise<VerificationExecution> {
    const profile = this.profiles[profileId];

    if (!profile) {
      throw new Error(
        `Trusted verification profile not found: ${profileId}`,
      );
    }

    const authorization = this.capabilityManager.authorize(
      this.agentId,
      {
        resource: VERIFICATION_RESOURCE,
        action: VERIFICATION_ACTION,
        scope: profileId,
        executor: VERIFICATION_EXECUTOR,
        context: {
          path: profile.workingDirectory,
          profile_id: profileId,
        },
      },
    );

    if (!authorization.allowed) {
      throw new Error(
        `Verification capability denied for ${profileId}: ` +
        `${authorization.reason ?? 'unknown reason'}`,
      );
    }

    return this.runner.run(profileId);
  }

  async runMany(
    profileIds: readonly TrustedVerificationProfileId[],
  ): Promise<VerificationExecution[]> {
    const executions: VerificationExecution[] = [];

    for (const profileId of profileIds) {
      executions.push(await this.run(profileId));
    }

    return executions;
  }
}

export function registerVerificationCapabilities(
  capabilityManager: CapabilityManager,
  agentId: string,
  profileIds: readonly TrustedVerificationProfileId[],
  repositoryRoot: string,
): AgentProfile {
  const profiles = getTrustedVerificationProfiles(repositoryRoot);

  const capabilities = profileIds.map(profileId => ({
    id: `verification:${profileId}`,
    resource: VERIFICATION_RESOURCE,
    action: VERIFICATION_ACTION,
    scope: profileId,
    constraints: {
      executors: [VERIFICATION_EXECUTOR],
      allowed_paths: [profiles[profileId].workingDirectory],
    },
  }));

  const profile: AgentProfile = {
    id: agentId,
    name: `verification-agent-${agentId}`,
    capabilities,
    max_concurrent_tasks: 1,
    trust_level: 1,
  };

  capabilityManager.registerProfile(profile);

  return profile;
}
