import { Command } from 'commander';
import { createCommand } from './create.js';
import { listCommand } from './list.js';
import { getCommand } from './get.js';
import { updateCommand } from './update.js';
import { deleteCommand } from './delete.js';
import { measurementsCommand } from './measurements.js';

export const devicesCommand = new Command('devices')
  .description('Manage devices');

devicesCommand.addCommand(createCommand);
devicesCommand.addCommand(listCommand);
devicesCommand.addCommand(getCommand);
devicesCommand.addCommand(updateCommand);
devicesCommand.addCommand(deleteCommand);
devicesCommand.addCommand(measurementsCommand);
