#!/usr/bin/env node

const program = require('commander');
const parse = require('yargs-parser');
const { logger } = require('svrx-util');
const updateNotifier = require('update-notifier');
const pkg = require('../package.json');

const Manager = require('../lib');
const commands = require('../lib/commands');

const manager = new Manager();
const printErrorAndExit = (error) => {
    logger.error(error);
    process.exit(1);
};
const prepareSvrx = async (options) => {
    const spinner = logger.progress('Loading svrx...');
    try {
        await manager.loadConfigFile(); // load user config file
        const svrx = await manager.loadSvrx(options);
        if (spinner) spinner();

        return svrx;
    } catch (e) {
        if (spinner) spinner();
        printErrorAndExit(e);
    }
};

updateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24 * 7 // 1 week
}).notify();

program.version(require('../package').version).usage('<command> [options]');

program
    .command('serve')
    .description('Start a develop server')
    .alias('s')
    .allowUnknownOption()
    .action(async () => {
        const options = parse(process.argv.slice(2));
        // remove not-option cmd(not started with '-'
        delete options['_'];

        const svrx = await prepareSvrx(options);
        svrx.start();
    });

program
    .command('ls')
    .description('List svrx versions installed locally')
    .action(async () => {
        const spinner = logger.progress('Looking for svrx versions...');
        try {
            const versions = manager.getLocalVersions();
            const tags = await manager.getRemoteTags();
            if (spinner) spinner();

            if (versions && versions.length > 0) {
                console.log('Svrx Versions Installed:\n');
                console.log(versions.join(', '), '\n');
                if (tags.latest !== versions[versions.length - 1]) {
                    console.log('There is a new version of svrx, run "svrx install" to install the latest one.');
                }
            } else {
                console.log('There is no svrx installed.\n');
                console.log('You can install the latest version using: "svrx install".');
            }
        } catch (e) {
            if (spinner) spinner();
            printErrorAndExit(e);
        }
    });

program
    .command('ls-remote')
    .description('List remote svrx versions available for install')
    .action(async () => {
        const spinner = logger.progress('Looking for svrx versions...');
        try {
            const versions = await manager.getRemoteVersions();
            const tags = await manager.getRemoteTags();
            if (spinner) spinner();

            console.log('Available Svrx Versions:\n');
            console.log(versions.join(', '));
            console.log('\nTags:\n');
            Object.keys(tags).forEach((tag) => {
                console.log(`${tag}: ${tags[tag]}`);
            });
        } catch (e) {
            if (spinner) spinner();
            printErrorAndExit(e);
        }
    });

program
    .command('install')
    .description('Download and install a specific svrx < version >')
    .action(async (version) => {
        if (typeof version !== 'string') {
            version = 'latest';
        }

        const spinner = logger.progress(`Installing svrx@${version}...`);
        try {
            await manager.install(version);
            if (spinner) spinner();
            logger.notify(`Successfully installed svrx@${version}`);
        } catch (e) {
            if (spinner) spinner();
            printErrorAndExit(e);
        }
    });

program
    .command('help')
    .description('List commands and options for svrx')
    .action(async () => {
        console.log('Usage: svrx <command> [options]\n');
        console.log('Commands and options:\n');

        // help info of command:serve
        console.log('serve|s    Start a develop server');
        const svrx = await prepareSvrx();
        const optionList = svrx.getConfigList();
        commands.printServeHelp(optionList);
    });

const options = parse(process.argv.slice(2));
const cmds = options['_'];

if (cmds.length === 0) {
    process.argv.splice(2, 0, 'serve');
}
program.parse(process.argv);

if (!program.args.length) {
    program.help();
}
