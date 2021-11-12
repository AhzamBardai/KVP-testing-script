CMD=${1}

echo "$CMD" >> testVue.txt
node index.js
rm testVue.txt
$SHELL