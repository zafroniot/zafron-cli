import { Command } from 'commander';
import { listCommand } from './list.js';
import { getCommand } from './get.js';
import { createCommand } from './create.js';

export const profilesCommand = new Command('profiles')
  .description('Manage device profiles');

profilesCommand.addCommand(createCommand);
profilesCommand.addCommand(listCommand);
profilesCommand.addCommand(getCommand);
