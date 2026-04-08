PROJECT_NAME="ultimate-gj"

# Delete build dir
rm -fr ./build

# Build project outside of peek dir
tsc ./projects/$PROJECT_NAME/*.ts --ignoreConfig --outDir ../peek-built/ --noCheck

# Move built to inside (renaming to `build`)
mv ../peek-built ./build

# Remove examples and node modules... just in case
rm -fr ./build/examples
rm -fr ./build/node-modules

# Copy all non-TS files over to the built file
find projects/$PROJECT_NAME -type f ! -name "*.ts" -exec sh -c 'mkdir -p "./build/$(dirname "$1")" && cp -p "$1" "./build/$1"' _ {} \;

# Copy non-TS fiels from src
find src/ -type f ! -name "*.ts" -exec sh -c 'mkdir -p "./build/$(dirname "$1")" && cp -p "$1" "./build/$1"' _ {} \;

# Remove `.md`, `.ase`, and `.aseprite` files from the BUILD file
find ./build -type f \( -name "*.md" -o -name "*.ase" -o -name "*.aseprite" -o -name "*.html" \) -delete

# Put HTML to run the `main.js` file in the built folder!
echo "<script>window.fetchRelativeTo='projects/$PROJECT_NAME/';</script><script type='module' src='./projects/$PROJECT_NAME/main.js'></script>" > ./build/index.html

# Add `.js` extensions to all relative imports in built `.js` files
SED_SCRIPT=$(mktemp)
cat > "$SED_SCRIPT" << 'EOF'
s/(^import[^"']*)(["'][a-zA-Z_\/.]*)(["'];)/\1\2.js\3/g
EOF
find ./build -name "*.js" -exec sed -i '' -E -f "$SED_SCRIPT" {} \;
rm "$SED_SCRIPT"
