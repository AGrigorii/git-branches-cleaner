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

const RED_FONT_COLOR = '\x1b[31m';
const GREEN_FONT_COLOR = '\x1b[32m';
const YELLOW_FONT_COLOR = '\x1b[33m';
const BLUE_FONT_COLOR = '\x1b[34m';
const MAGENTA_FONT_COLOR = '\x1b[35m';

const RED_BG_COLOR = '\x1b[41m';
const YELLOW_BG_COLOR = '\x1b[43m';
const WHITE_BG_COLOR = '\x1b[47m';

const RESET_COLOR = '\x1b[0m';

function highlightText(text, color) {
    return `${ color }${ text }${ RESET_COLOR }`;
}

function highlightedLog(color, message) {
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
    return ex('git fetch --all --quiet --prune').exitCode;
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
    highlightedLog(RED_BG_COLOR, '### START OF DELETING REMOTE BRANCHES ###');
    branches.forEach(x => deleteRemoteBranch(x));
}

function fullBranchInfo(branch) {
    const command = `git log ${ branch } -1 --format="%cr%n%an%n%cn%n%ct"`;
    const res = ex(command);
    const [date, author, committer, timestamp] = res.data.split('\n');
    return {
        branchInfo: `${ highlightText(branch, MAGENTA_FONT_COLOR) }` +
        ` Last commit was: ${ highlightText(date, BLUE_FONT_COLOR) }` +
        ` Author: ${ highlightText(author, RED_FONT_COLOR) }` +
        ` Committer: ${ highlightText(committer, GREEN_FONT_COLOR) }`,
        timestamp: timestamp,
        branchName: branch
    }
}

(function main(argv) {
    let exitCode = checkGitRepoExists() || checkGitRemoteRepoExists() || gitFetchAll();
    if (exitCode) {
        console.log(`script executed with code: ${ exitCode }`);
        return;
    }

    const remoteBranches = getListOfRemoteBranches(/(master|release|HEAD|develop)/);

    const maxDiff = argv.olderThan * 24 * 60 * 60;
    const oldBranches = filterByDate(remoteBranches, maxDiff);

    //highlightedLog(BLUE_COLOR, `### LIST OF BRANCHES, WHICH ARE OLDER THAN ${ argv.olderThan } DAY(S) ###`);
    const oldBranchesWithInfo = oldBranches.map(x => fullBranchInfo(x)).sort((x, y) => x.timeStamp - y.timeStamp);

    if (argv.mode === 'show') {
        return;
    }

    deleteOldBranches(oldBranches);
})(argv);
