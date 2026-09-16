import vm from 'node:vm';

let raw = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  raw += chunk;
});

process.stdin.on('end', async () => {
  const started = process.hrtime.bigint();

  try {
    const request = JSON.parse(raw);

    const logs = [];

    const safeConsole = {
      log: (...args) => {
        logs.push(args.map(value => String(value)).join(' '));
      },
      error: (...args) => {
        logs.push(`ERROR: ${args.map(value => String(value)).join(' ')}`);
      },
      warn: (...args) => {
        logs.push(`WARN: ${args.map(value => String(value)).join(' ')}`);
      },
    };

    const allowedModules = new Set(
      Array.isArray(request.allowedModules)
        ? request.allowedModules
        : [],
    );

    const safeRequire = moduleName => {
      if (!allowedModules.has(moduleName)) {
        throw new Error(
          `Module '${moduleName}' not in sandbox allowlist`,
        );
      }

      switch (moduleName) {
        case 'math':
          return Math;

        case 'json':
          return JSON;

        case 'crypto':
          return Object.freeze({
            getRandomValues: crypto.getRandomValues.bind(crypto),
          });

        default:
          throw new Error(
            `Module '${moduleName}' has no safe implementation`,
          );
      }
    };

    const input = request.input ?? {};

    const inputGlobals = Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        `input_${key}`,
        value,
      ]),
    );

    const context = vm.createContext(
      {
        __inputs: input,
        ...inputGlobals,
        __console: safeConsole,
        console: safeConsole,
        require: safeRequire,
        Math,
        JSON,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Promise,
        Set,
        Map,
        RegExp,
        Error,
        TypeError,
        RangeError,
        Uint8Array,
        ArrayBuffer,
      },
      {
        name: 'agent-os-sandbox',
        codeGeneration: {
          strings: false,
          wasm: false,
        },
      },
    );

    const wrapped = `
      "use strict";

      (async function(__inputs, __console, require) {
        ${request.code}
      })(__inputs, __console, require)
    `;

    const script = new vm.Script(wrapped, {
      filename: 'agent-os-sandbox.js',
      displayErrors: true,
    });

    const result = await script.runInContext(context, {
      timeout: 1000,
      displayErrors: true,
    });

    const resource = process.resourceUsage();

    const cpuMs =
      (resource.userCPUTime + resource.systemCPUTime) / 1000;

    const memoryPeakMb = resource.maxRSS / 1024;

    process.stdout.write(
      JSON.stringify({
        type: 'result',
        success: true,
        output: result,
        logs,
        memory_peak_mb: memoryPeakMb,
        cpu_ms: cpuMs,
      }) + '\n',
    );
  } catch (error) {
    const resource = process.resourceUsage();

    const cpuMs =
      (resource.userCPUTime + resource.systemCPUTime) / 1000;

    const memoryPeakMb = resource.maxRSS / 1024;

    process.stdout.write(
      JSON.stringify({
        type: 'result',
        success: false,
        output: null,
        logs: [],
        error: error instanceof Error
          ? error.message
          : String(error),
        memory_peak_mb: memoryPeakMb,
        cpu_ms: cpuMs,
      }) + '\n',
    );

    process.exitCode = 1;
  }
});
