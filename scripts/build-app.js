// Build script to prepare files for Capacitor Android App
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'www');

// Clean and create www directory
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy individual files
const filesToCopy = [
    { src: 'admin.html', dest: 'index.html' }, // Set admin.html as entry point for the app
    { src: 'admin.html', dest: 'admin.html' },
    { src: 'admin-car.html', dest: 'admin-car.html' },
    { src: 'admin-commission.html', dest: 'admin-commission.html' },
    { src: 'admin.js', dest: 'admin.js' },
    { src: 'admin-car.js', dest: 'admin-car.js' },
    { src: 'admin-commission.js', dest: 'admin-commission.js' },
    { src: 'app.js', dest: 'app.js' },
    { src: 'mobile-bridge.js', dest: 'mobile-bridge.js' },
    { src: 'style.css', dest: 'style.css' }
];

filesToCopy.forEach(file => {
    const srcPath = path.join(rootDir, file.src);
    const destPath = path.join(distDir, file.dest);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${file.src} -> www/${file.dest}`);
    }
});

// Copy directories
const dirsToCopy = ['assets', 'data'];
dirsToCopy.forEach(dir => {
    const srcPath = path.join(rootDir, dir);
    const destPath = path.join(distDir, dir);
    if (fs.existsSync(srcPath)) {
        fs.cpSync(srcPath, destPath, { recursive: true });
        console.log(`Copied directory: ${dir} -> www/${dir}`);
    }
});

console.log('App web assets built successfully in www/');
