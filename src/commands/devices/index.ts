import { Command } from 'commander';
import { createCommand } from './create.js';

export const devicesCommand = new Command('devices')
  .description('Manage devices');

devicesCommand.addCommand(createCommand);
