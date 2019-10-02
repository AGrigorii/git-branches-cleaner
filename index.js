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
        .map(x => x.trim().replace('origin/', ''))
        .filter(x => !x.match(excludedRegex));
}

(function main(){
    let exitCode = checkGitRepoExists() || checkGitRemoteRepoExists() || gitFetchAll();
    if (exitCode) {
        console.log(`script executed with code: ${exitCode}`);
        return;
    }
    const remoteBranches = getListOfRemoteBranches(/(master|release|HEAD)/);
    console.log(remoteBranches);
})();
