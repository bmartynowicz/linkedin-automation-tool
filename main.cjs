// main.cjs

import('./main.js')
  .catch((err) => {
    console.error('Error loading main.js:', err);
  });
