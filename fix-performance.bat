@echo off
echo 🧹 Cleaning cache and rebuilding...

echo Stopping development server...
taskkill /f /im node.exe 2>nul

echo Clearing npm cache...
npm cache clean --force

echo Removing node_modules...
rmdir /s /q node_modules 2>nul

echo Removing dist folder...
rmdir /s /q dist 2>nul

echo Reinstalling dependencies...
npm install

echo Building project...
npm run build

echo 🎉 Performance fix complete!
echo You can now run: npm run dev
pause