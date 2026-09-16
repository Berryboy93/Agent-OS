import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, lstat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const execFileAsync = promisify(execFile);

export interface RepositoryProvenance {
  readonly repositoryRoot: string;
  readonly headRevision: string;
  readonly status: string;
  readonly stagedDiffHash: string;
  readonly workingTreeDiffHash: string;
  readonly untrackedFilesHash: string;
  readonly fingerprint: string;
}

async function git(
  repositoryRoot: string,
  args: readonly string[],
): Promise<string> {
  const result = await execFileAsync(
    'git',
    [...args],
    {
      cwd: repositoryRoot,
      shell: false,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  return String(result.stdout ?? '');
}

function hashText(value: string): string {
  return createHash('sha256')
    .update(value, 'utf8')
    .digest('hex');
}

async function hashUntrackedFiles(
  repositoryRoot: string,
): Promise<string> {
  const output = await git(repositoryRoot, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
  ]);

  const paths = output
    .split('\0')
    .filter(Boolean)
    .sort();

  const hash = createHash('sha256');

  for (const relativePath of paths) {
    const absolutePath = resolve(repositoryRoot, relativePath);
    const stat = await lstat(absolutePath);

    hash.update(relativePath, 'utf8');
    hash.update('\0', 'utf8');

    if (stat.isFile()) {
      hash.update(await readFile(absolutePath));
    } else if (stat.isSymbolicLink()) {
      hash.update(
        await readFile(absolutePath, 'utf8').catch(() => ''),
        'utf8',
      );
    } else {
      hash.update(`${stat.mode}:${stat.size}:${stat.mtimeMs}`, 'utf8');
    }

    hash.update('\0', 'utf8');
  }

  return hash.digest('hex');
}

export async function captureRepositoryProvenance(
  repositoryRoot: string,
): Promise<RepositoryProvenance> {
  const root = resolve(repositoryRoot);

  const [
    headRevision,
    status,
    stagedDiff,
    workingTreeDiff,
    untrackedFilesHash,
  ] = await Promise.all([
    git(root, ['rev-parse', 'HEAD']),
    git(root, ['status', '--porcelain=v1', '--untracked-files=all']),
    git(root, ['diff', '--cached', '--binary']),
    git(root, ['diff', '--binary']),
    hashUntrackedFiles(root),
  ]);

  const normalizedStatus = status.trimEnd();
  const normalizedHead = headRevision.trim();

  const stagedDiffHash = hashText(stagedDiff);
  const workingTreeDiffHash = hashText(workingTreeDiff);

  const fingerprint = hashText(
    [
      `repositoryRoot=${relative(process.cwd(), root)}`,
      `headRevision=${normalizedHead}`,
      `status=${normalizedStatus}`,
      `stagedDiffHash=${stagedDiffHash}`,
      `workingTreeDiffHash=${workingTreeDiffHash}`,
      `untrackedFilesHash=${untrackedFilesHash}`,
    ].join('\n'),
  );

  return {
    repositoryRoot: root,
    headRevision: normalizedHead,
    status: normalizedStatus,
    stagedDiffHash,
    workingTreeDiffHash,
    untrackedFilesHash,
    fingerprint,
  };
}

export function sameRepositoryProvenance(
  expected: RepositoryProvenance,
  actual: RepositoryProvenance,
): boolean {
  return (
    expected.repositoryRoot === actual.repositoryRoot &&
    expected.headRevision === actual.headRevision &&
    expected.status === actual.status &&
    expected.stagedDiffHash === actual.stagedDiffHash &&
    expected.workingTreeDiffHash === actual.workingTreeDiffHash &&
    expected.untrackedFilesHash === actual.untrackedFilesHash &&
    expected.fingerprint === actual.fingerprint
  );
}
