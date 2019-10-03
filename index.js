#!/usr/bin/env node
const argv = require('yargs')
    .options({
        'mode': {
            alias: 'm',
            description: 'Choose mode of execution',
            choices: ['show', 'delete'],
            default: 'show'
        },
        'older-than': {
            alias: 'o',
            description: 'Consider branches, which last commit date was older than chosen days ago',
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

const BLUE_COLOR = '\x1b[44m';
const RED_COLOR = '\x1b[41m';

function highlightedLog(color, message) {
    const defaultColor = '\x1b[0m';
    console.log('\n');
    console.log(color, message, defaultColor);
}

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
        console.log(`There is no output for command ${ command }`);
    }

    return {
        exitCode,
        data: result && result.toString()
    };
}

function checkGitRepoExists() {
    return ex('git status').exitCode;
}

function checkGitRemoteRepoExists() {
    return ex('git remote', false).exitCode;
}

function getListOfRemoteBranches(excludedRegex) {
    return ex('git branch --remote', true)
        .data
        .split('\n')
        .filter(x => x)
        .map(x => x.trim())
        .filter(x => !excludedRegex || !x.match(excludedRegex));
}

function gitFetchAll() {
    highlightedLog(BLUE_COLOR, '### FETCHING DATA FROM REMOTE REPOSITORY ###');
    return ex('git fetch --all').exitCode;
}

function getLastCommitDate(branch) {
    const command = `git log ${ branch } -1 --format="%ct"`;
    return parseInt(ex(command).data);
}

function filterByDate(branches, maxDiff) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    return branches.filter(x => timestamp - getLastCommitDate(x) > maxDiff);
}

function deleteRemoteBranch(branch) {
    branch = branch.replace('origin/', '');
    const command = `git push --delete origin ${ branch }`;
    const res = ex(command);
    console.log(res.data);
}

function deleteOldBranches(branches) {
    highlightedLog(RED_COLOR, '### START OF DELETING REMOTE BRANCHES ###');
    branches.forEach(x => deleteRemoteBranch(x));
}

(function main(argv) {
    let exitCode = checkGitRepoExists() || checkGitRemoteRepoExists() || gitFetchAll();
    if (exitCode) {
        console.log(`script executed with code: ${ exitCode }`);
        return;
    }

    const remoteBranches = getListOfRemoteBranches(/(master|release|HEAD)/);

    const maxDiff = argv.olderThan * 24 * 60 * 60;
    const oldBranches = filterByDate(remoteBranches, maxDiff);

    highlightedLog(BLUE_COLOR, `### LIST OF BRANCHES, WHICH ARE OLDER THAN ${ argv.olderThan } DAY(S) ###`);
    oldBranches.forEach(x => console.log(x));

    if (argv.mode === 'show') {
        return;
    }

    deleteOldBranches(oldBranches);
})(argv);
