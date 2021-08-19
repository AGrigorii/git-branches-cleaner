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
const fs = require('fs');
const path = require('path');

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
    if (fs.existsSync(path.resolve(process.cwd(), '.git'))) {
        return 0;
    }
    logError('Current location does not contain git repository in the root.');
    return -1;
}

function checkGitRemoteRepoExists() {
    if (!fs.existsSync(path.resolve(process.cwd(), '.git/refs/remotes')) ||
        !fs.existsSync(path.resolve(process.cwd(), '.git/refs/remotes/origin'))) {
        logError('Current git repository does not contain reference to "origin" remote repository.');
        return -1;
    }
    return 0;
}

function gitFetchAll() {
    return ex('git fetch --all --quiet --prune').exitCode;
}

function getAllRemotes(excludedRegex) {
    const data = ex(`git for-each-ref --format='%(refname)#_#%(committerdate:unix)#_#%(authorname)#_#%(committername)#_#%(committerdate:relative)' refs/remotes/origin`)
        .data
        .split('\n')
        .map(x => x.replace(/'/g, '').replace('refs/remotes/', ''));
    return data.map(x => {
        const [branchName, timestamp, authorName, committerName, relativeDate] = x.split('#_#');
        return {
            ['Branch Name']: branchName,
            timestamp: parseInt(timestamp),
            ['Author']: authorName,
            ['Committer']: committerName,
            ['Last commit']: relativeDate
        };
    }).filter(x => x['Branch Name'] && (!excludedRegex || !x['Branch Name'].match(excludedRegex)));
}

function filterByDate(branches, maxDiff) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    return branches.filter(x => timestamp - x.timestamp > maxDiff);
}

function deleteOldBranches(branches) {
    console.log('\x1b[33m###\x1b[0m \x1b[31mSTART OF DELETING REMOTE BRANCHES\x1b[0m \x1b[33m###\x1b[0m');
    branches.forEach(x => deleteRemoteBranch(x['Branch Name']));
}

function deleteRemoteBranch(branch) {
    branch = branch.replace('origin/', '');
    const command = `git push --delete origin ${ branch }`;
    const res = ex(command);
    console.log(res.data);
}

(function main(argv) {
    let exitCode = checkGitRepoExists() || checkGitRemoteRepoExists() || gitFetchAll();
    if (exitCode) {
        console.log(`script executed with code: ${ exitCode }`);
        return;
    }

    const allRemotes = getAllRemotes(/(master|release|HEAD|develop)/);
    const maxDiff = argv.olderThan * 24 * 60 * 60;
    const oldBranches = filterByDate(allRemotes, maxDiff);

    if (oldBranches.length === 0) {
        console.log(`\x1b[31mTHERE ARE NO BRANCHES OLDER THAN \x1b[32m${ argv.olderThan } DAY${ argv.olderThan === 1
            ? ''
            : 'S' }\x1b[0m`);
        return;
    }

    oldBranches.sort((x, y) => x.timestamp - y.timestamp);

    if (argv.mode === MODES.show) {
        console.table(oldBranches, ['Branch Name', 'Last commit', 'Author', 'Committer']);
        return;
    }

    deleteOldBranches(oldBranches);
})(argv);

function logError(message) {
    console.log(`\x1b[31m${ message }\x1b[0m`);
}
