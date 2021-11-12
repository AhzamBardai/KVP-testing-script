CMD=${1}

echo "Removing testVue.txt (if exists)..."
rm -f testVue.txt
echo "Removal complete"

echo "Performing Single File KVP check on file: $CMD"
echo "----------------------------------------------------------"
echo ""

echo "$CMD" >> testVue.txt
node singleFileKVPValuesTest.js

echo ""
echo "----------------------------------------------------------"
rm -f testVue.txt
echo "Completed"

$SHELL