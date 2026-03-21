import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { devicesCommand } from './commands/devices/index.js';
import { sourcesCommand } from './commands/sources/index.js';
import { profilesCommand } from './commands/profiles/index.js';

const program = new Command();

program
  .name('zafron')
  .description('CLI tool for the Zafron IoT platform')
  .version('0.1.0');

program.addCommand(loginCommand);
program.addCommand(devicesCommand);
program.addCommand(sourcesCommand);
program.addCommand(profilesCommand);

program.parse();
