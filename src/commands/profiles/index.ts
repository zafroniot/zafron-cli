import { Command } from 'commander';
import { createCommand } from './create.js';
import { listCommand } from './list.js';
import { getCommand } from './get.js';
import { updateCommand } from './update.js';
import { deleteCommand } from './delete.js';
import { decoderCommand } from './decoder.js';

export const profilesCommand = new Command('profiles')
  .description('Manage device profiles');

profilesCommand.addCommand(createCommand);
profilesCommand.addCommand(listCommand);
profilesCommand.addCommand(getCommand);
profilesCommand.addCommand(updateCommand);
profilesCommand.addCommand(deleteCommand);
profilesCommand.addCommand(decoderCommand);
