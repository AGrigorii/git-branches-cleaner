#!/usr/bin/env node
const argv = require('yargs')
    .options({
        'mode': {
            alias: 'm',
            description: 'show or delete old branches',
            choices: ['show', 'delete'],
            default: 'show'
        },
        'older-than': {
            alias: 'o',
            description: 'Process branches older than (in days)',
            default: 90,
            type: 'number'
        }
    })
    .check(function (argv) {
        if (argv.olderThan > 0) {
            return true;
        } else {
            throw new Error('older-than parameter must be a positive integer');
        }
    })
    .locale('en')
    .help()
    .alias('help', 'h')
    .alias('version', 'v')
    .argv;

const exec = require('child_process').execSync;

function ex(command, isEmptyStdoutGood = true) {
    let exitCode = 0;
    let result;
    try {
        result = exec(command);
    } catch (e) {
        exitCode = e.status;
    }

    if (!isEmptyStdoutGood && !result) {
        exitCode = 1;
        console.log(`There is no output for command ${command}`);
    }

    return {
        exitCode,
        data: result.toString()
    };
}

function checkGitRepoExists() {
    return ex('git status').exitCode;
}

function checkGitRemoteRepoExists() {
    return ex('git remote', false).exitCode;
}

function gitFetchAll() {
    return ex('git fetch --all').exitCode;
}

function getListOfRemoteBranches(excludedRegex) {
    return ex('git branch --remote', true)
        .data
        .split('\n')
        .filter(x => x)
        .map(x => x.trim())
        .filter(x => !excludedRegex || !x.match(excludedRegex));
}

function getLastCommitDate(branch) {
    const command = `git log ${branch} -1 --format="%ct"`;
    return parseInt(ex(command).data);
}

function filterByDate(branches, maxDiff) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    return branches.filter(x => timestamp - getLastCommitDate(x) > maxDiff);
}

function deleteRemoteBranch(branch) {
    branch = branch.replace('origin/', '');
    const command = `git push --delete origin ${branch}`;
    ex(command);
}

function deleteOldBranches(branches) {
    branches.forEach(x => deleteRemoteBranch(x));
}

(function main(argv){
    let exitCode = checkGitRepoExists() || checkGitRemoteRepoExists() || gitFetchAll();
    if (exitCode) {
        console.log(`script executed with code: ${exitCode}`);
        return;
    }

    const remoteBranches = getListOfRemoteBranches(/(master|release|HEAD)/);

    const maxDiff = argv.olderThan * 24 * 60 * 60;
    const oldBranches = filterByDate(remoteBranches, maxDiff);

    if (argv.mode === 'show') {
        oldBranches.forEach(x => console.log(x));
        return;
    }
    deleteOldBranches(oldBranches);
})(argv);
