const fs = require('fs');

function updateFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  content = content.replace(/bg-\[#060F0C\]/g, 'bg-gray-50 dark:bg-[#060F0C]');
  content = content.replace(/bg-\[#040D0B\]/g, 'bg-white dark:bg-[#040D0B]');
  content = content.replace(/bg-\[#1a1c1c\]/g, 'bg-gray-100 dark:bg-[#1a1c1c]');
  
  content = content.replace(/text-white/g, 'text-gray-900 dark:text-white');
  content = content.replace(/text-gray-400/g, 'text-gray-600 dark:text-gray-400');
  content = content.replace(/text-gray-300/g, 'text-gray-600 dark:text-gray-300');
  content = content.replace(/border-white\/10/g, 'border-gray-200 dark:border-white/10');
  content = content.replace(/border-white\/5/g, 'border-gray-200 dark:border-white/5');
  content = content.replace(/bg-white\/\[0\.02\]/g, 'bg-black/5 dark:bg-white/[0.02]');
  content = content.replace(/bg-white\/\[0\.01\]/g, 'bg-black/5 dark:bg-white/[0.01]');

  fs.writeFileSync(path, content, 'utf8');
  console.log('Updated ' + path);
}

['client/src/pages/new-landing/HowItWorks.tsx', 'client/src/pages/new-landing/WhyNevara.tsx'].forEach(updateFile);
