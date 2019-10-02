# Git-branches-cleaner
Tool for deleting old branches from your remote git repository

## Install package
`npm install -g git-branches-cleaner`

## Usage examples
Show branches older than `15` days: `git-branches-cleaner --mode show --older-than 15`

Delete branches older than `100` days: `git-branches-cleaner -m delete -o 100`

Create file with branches older than `5` days: `git-branches-cleaner -o 5 > output.txt`

## Options
* `--version, -h` Show version number
* `--mode, -m` Choose mode of execution `(show | delete)` `[defult: show]`
* `--older-than, -o` Consider branches, which last commit date was older than chosen days ago `[default: 90]`
* `--help, -h` Show help

# Changelog
`0.0.1` Initial version

`1.0.0` Fix package.json dependencies