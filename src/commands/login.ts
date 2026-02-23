import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ApiClient } from '../lib/api-client.js';
import { getConfig, saveConfig } from '../lib/config.js';
import * as out from '../lib/output.js';

async function promptPassword(): Promise<string> {
  return new Promise<string>((resolve) => {
    process.stdout.write('Password: ');
    let pwd = '';

    if (input.isTTY) {
      input.setRawMode(true);
    }
    input.resume();

    const onData = (ch: Buffer) => {
      const char = ch.toString();
      if (char === '\n' || char === '\r' || char === '\u0004') {
        if (input.isTTY) input.setRawMode(false);
        input.removeListener('data', onData);
        input.pause();
        process.stdout.write('\n');
        resolve(pwd);
      } else if (char === '\u0003') {
        process.exit(1);
      } else if (char === '\u007F' || char === '\b') {
        if (pwd.length > 0) pwd = pwd.slice(0, -1);
      } else {
        pwd += char;
      }
    };

    input.on('data', onData);
  });
}

export const loginCommand = new Command('login')
  .description('Log in to the Zafron platform')
  .action(async () => {
    try {
      const rl = readline.createInterface({ input, output });
      const email = await rl.question('Email: ');
      rl.close();

      const password = await promptPassword();

      const config = await getConfig();
      const client = new ApiClient(config.apiUrl);
      const response = (await client.post('/api/users/login', {
        username: email,
        password,
      })) as { user: unknown; token: string };

      config.token = response.token;
      await saveConfig(config);

      out.success('Logged in successfully.');
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
