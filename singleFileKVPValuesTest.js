/* eslint-disable no-param-reassign */
/* eslint-disable no-useless-return */
/* eslint-disable no-plusplus */
/* eslint-disable vars-on-top */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
const fs = require('fs');
const readLine = require('readline');

// formatted -----------------------------------------------------


const file = './testVue.txt';
var fileToRead = '';
const rlShell = readLine.createInterface({
  input: fs.createReadStream(file),
  output: process.stdout,
  terminal: false,
});
rlShell.on('line', (text) => fileToRead = text)

setTimeout(() => formatKVPs(), 30)

function formatKVPs() {
  const rl = readLine.createInterface({
    input: fs.createReadStream(fileToRead),
    output: process.stdout,
    terminal: false,
  });
  
  function checkBrackets(str) {
    var curlyOpen = 0;
    var curlyClose = 0;
    var parenOpen = 0;
    var parenClose = 0;
  
    // count total brackets
    str.split('').forEach((item) => {
      switch (item) {
        case '{': curlyOpen++; return;
        case '}': curlyClose++; return;
        case '(': parenOpen++; return;
        case ')': parenClose++; return;
        default: return;
      }
    });
  
    // remove extra brackets
    for (var i = str.length; i >= 0; i--) {
      if (curlyOpen !== curlyClose) {
        if (str[i] === '}') {
          str = str.slice(0, i) + str.slice(i + 1);
          curlyClose--;
        } else if (str[i] === '{') {
          str = str.slice(0, i) + str.slice(i + 1);
          curlyOpen--;
        }
      } else if (parenOpen !== parenClose && (str[i] === ')' || str[i] === '(')) {
        if (str[i] === ')') {
          str = str.slice(0, i) + str.slice(i + 1);
          parenClose--;
        } else if (str[i] === '(') {
          str = str.slice(0, i) + str.slice(i + 1);
          parenOpen--;
        }
      } else if (parenOpen === parenClose && curlyOpen === curlyClose) {
        break;
      }
    }
  
    return str;
  }
  
  function beforeImportFormat(str) {
    for(var i = str.length - 1; i >= 0 ; i--){
      const last = str.length - 1
      if(str[last] !== ')') {
          str = str.slice(0, last) 
      }
    }
    return str;
  }
  
  function formatedFunc() {
    var funcs = "";
    rl.on('line', (text) => {
      if (text.includes('$t')) {
        const arrFormatString = text.substring(text.indexOf('$t')).replace(';', '');
        const formatBrackets = `this.${checkBrackets(arrFormatString)}`;
        const fixBeforeImport = beforeImportFormat(formatBrackets);
        funcs += fixBeforeImport + ';'
      }
    }).on('close', () => {
      const funcArr = funcs.split(';').reduce((acc, next, ind) => {
          if(next === '') return acc
          acc[`Line${ind}`] = next;
          return acc;
      }, {});
      console.log(funcArr)
      fs.writeFile(file, JSON.stringify(funcArr) , err => err ? console.error(err) : null)
    });
  }
  
  formatedFunc()
}
// fs.unlinkSync(file)




