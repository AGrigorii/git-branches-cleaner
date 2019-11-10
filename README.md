# Git-branches-cleaner
Tool for deleting old branches from your remote git repository

From version 2.0.0 it is required the node.js version >= 10.0.0
## Install package
`npm install -g git-branches-cleaner`

## Usage examples
Show branches older than `15` days: `git-branches-cleaner --mode show --older-than 15`

Delete branches older than `100` days: `git-branches-cleaner -m delete -o 100`

## Options
* `--version, -h` Show version number
* `--mode, -m` Choose mode of execution `(show | delete)` `[defult: show]`
* `--older-than, -o` Consider branches, which last commit date was older than chosen days ago `[default: 90]`
* `--help, -h` Show help

## Notes
* You should call script from the root of some git directory
* Only remote branches can be affected
* Only remote repo with name `origin` can be affected
* Branch will be skipped, if contains `master`, `release` or `develop` as substring
* If some branch should be restored, you can do it by command `git push origin -u <branch_name>` (such branch should exists in local git repository)
* Branch is calling old, if the last commit was `x` days ago

## Contact
If you have some thoughts or want to get some feature, please, contact me at <a href="https://t.me/agrigorii/">Telegram @agrigorii</a>.