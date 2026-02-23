import { Command } from 'commander';

const program = new Command();

program
  .name('zafron')
  .description('CLI tool for the Zafron IoT platform')
  .version('0.1.0');

program.parse();
