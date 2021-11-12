# KVP Testing Script
- The purpose of this script is to make testing easier whe localizing frontend files using Vue.js and i18n. If you can't find a component on screen but would like to see the changes you made and if they worked as intended, this might be perfect for you. This is still a work in progress and is not fully automated. Read the instructions below to get a better idea.

## Requirements
- You will need a working frontend with Vue.js and this script will not lint any for you
- The Vue file should already be refactored and with only the i18n function(" $t() ")

## Instructions to Run Locally

- Fork the repo to your personal github ( Only if you would like to help and send in a Pull Request )
- Clone the repo using `git clone REPO-URL`
- cd into the `KVP-testing-script` folder
- Run the script file and add your translated Vue file's path ahead of it, like so:
  - `./KVPTest.sh YOUR-FILE-PATH.vue`
- This should open a new terminal and give you key value pairs of your refactored functions
- You can now copy that object and put it in the `data()` function in the vue file and you will see the changes you made in the vue dev tools under the data compartment of the current vue you are testing 

## After running script (Bugs)
- This script currently will not seperate ternary statements
- This dcript returns an object whose values are strings with double quotes, which have to be manually removed before intended use

## Issues and Pull Requests
Any help on this will be most appreciated as I am quite new to automating tasks, pull requests are the best way for any changes and reach out through the isues tab.



