import { Command } from 'commander';
import { listCommand } from './list.js';
import { getCommand } from './get.js';

export const sourcesCommand = new Command('sources')
  .description('Manage data sources');

sourcesCommand.addCommand(listCommand);
sourcesCommand.addCommand(getCommand);
