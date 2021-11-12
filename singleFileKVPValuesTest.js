/* eslint-disable no-param-reassign */
/* eslint-disable no-useless-return */
/* eslint-disable no-plusplus */
/* eslint-disable vars-on-top */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
const fs = require('fs');
const readLine = require('readline');

//  read shell file for input of file path
const file = './testVue.txt';
var fileToRead = '';
const rlShell = readLine.createInterface({
  input: fs.createReadStream(file),
  output: process.stdout,
  terminal: false,
});
rlShell.on('line', (text) => fileToRead = text)

// time delay in reading file
setTimeout(() => formatKVPs(), 30)

// main function
function formatKVPs() {

  const rl = readLine.createInterface({
    input: fs.createReadStream(fileToRead),
    output: process.stdout,
    terminal: false,
  });

  var funcs = "";
  rl.on('line', (text) => {
    if (text.includes('$t')) {
      const arrFormatString = text.substring(text.indexOf('$t')).replace(';', '');
      const formatBrackets = checkBrackets(arrFormatString);
      const fixBeforeImport = beforeImportFormat(formatBrackets);
      const ternaryFormat = fixBeforeImport.includes(' : ') ? formatTernary(fixBeforeImport) : `this.${fixBeforeImport}`;
      // const varFormat = formatInterpolationVars(ternaryFormat);
      funcs += ternaryFormat + ';';
    }
  }).on('close', () => {
    const funcArr = funcs.split(';').reduce((acc, next, ind) => {
        if(next === '') return acc
        acc[`Line${ind}`] = next;
        return acc;
    }, {});

    // logs all testing KVPs
    console.log(funcArr)

    // write testing KVPs to a file
    // fs.writeFile(file, JSON.stringify(funcArr) , err => err ? console.error(err) : null)
  });
}

// removes any unused brackets from the line
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

// removes extra special characters before the line endings
function beforeImportFormat(str) {
  for(var i = str.length - 1; i >= 0 ; i--){
    const last = str.length - 1
    if(str[last] !== ')') {
        str = str.slice(0, last) 
    }
  }
  return str;
}

// removes ternary statements
function formatTernary(str) {

  // checks if the ternary has ' : ' or '): ' in the middle
  // if(str.includes('): ')) {
    
  //   // checks if ternary has an i18n function on the right of ':'
  //   const isI18n = str.split('').some((i, ind) => ind > str.indexOf('): ') && str[ind] === '$' && str[ind + 1] === 't')
  //   const doesHaveThis = str.includes('this') ? '' : 'this.'
    
  //   // if above var is false only keeps the right side of ternary if not then formats and keeps both sides
  //   const split = isI18n ? str.split('): ').join(`);${doesHaveThis}`) : str.slice(0, (str.indexOf('): ') + 1 ))
  //   console.log(split)
  //   return split;
    
  // } else if (str.includes(') : ') ) {
    
  //   // checks if ternary has an i18n function on the right of ':'
  //   const isI18n = str.split('').some((i, ind) => ind > str.indexOf(' : ') && str[ind] === '$' && str[ind + 1] === 't')
  //   const doesHaveThis = str.includes('this') ? '' : 'this.'

  //   // if above var is false only keeps the right side of ternary if not then formats and keeps both sides
  //   const split = isI18n ? str.split(' : ').join(`;${doesHaveThis}`) :  str.split(0, str.indexOf(' :'))

  //   console.log(split)
  //   return split
  // }

  if(str.includes(' ? ') && str.includes(' : ')) {
    const arr = str.split(' ? ').join(';').split(' : ').join(';')
    const split = arr.split(';').map((i) => i.includes('$t') ? `this.${i}` : '').filter((item) => item !== '' ).join(';')
    return split;
    
  } else if (str.includes(' : ') ) {
    const arr = str.split(' : ').join(';')
    const split = arr.split(';').map((i) => i.includes('$t') ? `this.${i}` : '').filter((item) => item !== '' ).join(';')
    return split;
  }
}

// does not work!!!
// stringify variables
function formatInterpolationVars(str) {
  const split = str.includes(';') ? str.split(';').map(i => i.slice(i.indexOf('{'), (i.indexOf('}') + 1))) : str.slice(i.indexOf('{'), (i.indexOf('}') + 1))
  var inds = []
  const haha = split.filter(i => i !== '').map((i) => i.split('').reduce((acc, item, ind) => {
    if(item === ':') {
      acc.push(i.substring(0, ind + 2) + "'" + i.substring(ind + 2))
    }
    return acc
  }, [])).join()
  
  const splitFormat = split.map((i, ind) => {
    if(i === '') return
    else {
      inds.push(ind)
      var afterColon = false
      var splitObj = i.split('')
      var newSplit = []
      splitObj.forEach((letter, index) => {
        letter === ':' ? afterColon = true : null
        afterColon && i === ' ' ? newSplit.push(splitObj.join('').substring(0, index) + "'" + splitObj.join('').substring(index + 1)) : null
      })
      //console.log(split)
    }
  })
  console.log(split)
  console.log(haha)
  // for(var i = 0; i < split.length; i++){
  //   var haha =  "'"
  //   if(i % 2 !== 0){
  //     const senten = split[i].split('')
  //     for(var j = 0; j < senten.length; j++ ) senten[j] === ' ' || senten[j] ==='}' ? null : haha += senten[j]
  //   }
  //   // console.log(haha + "'")
  // }
}