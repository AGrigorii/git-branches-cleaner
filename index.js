#!/usr/bin/env node
const MODES = {
    show: 'show',
    ['delete']: 'delete'
};
const argv = require('yargs')
    .options({
        'mode': {
            alias: 'm',
            description: 'Choose mode of execution',
            choices: Object.keys(MODES),
            default: MODES.show
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
    console.log('\x1b[33m###\x1b[0m \x1b[31mSTART OF DELETING REMOTE BRANCHES\x1b[0m \x1b[33m###\x1b[0m');
    branches.forEach(x => deleteRemoteBranch(x));
}

function fullBranchInfo(branch) {
    const command = `git log ${ branch } -1 --format="%cr%n%an%n%cn%n%ct"`;
    const res = ex(command);
    const [date, author, committer, timestamp] = res.data.split('\n');
    return {
        ['Last commit']: date,
        Author: author,
        Committer: committer,
        timestamp: timestamp,
        ['Branch Name']: branch
    };
}

(function main(argv) {
    let exitCode = checkGitRepoExists() || checkGitRemoteRepoExists() || gitFetchAll();
    if (exitCode) {
        console.log(`script executed with code: ${ exitCode }`);
        return;
    }

    const remoteBranches = getListOfRemoteBranches(/(master|release|HEAD|develop)/);

    const maxDiff = argv.olderThan * 24 * 60 * 60;
    const oldBranchNames = filterByDate(remoteBranches, maxDiff);

    if (oldBranchNames.length === 0) {
        console.log(`\x1b[31mTHERE ARE NO BRANCHES OLDER THAN \x1b[32m${ argv.olderThan } DAY${ argv.olderThan === 1
            ? ''
            : 'S' }\x1b[0m`);
        return;
    }

    const oldBranchesWithInfo = oldBranchNames.map(x => fullBranchInfo(x)).sort((x, y) => x.timeStamp - y.timeStamp);

    if (argv.mode === MODES.show) {
        console.table(oldBranchesWithInfo, ['Branch Name', 'Last commit', 'Author', 'Committer']);
        return;
    }

    deleteOldBranches(oldBranchNames);
})(argv);
