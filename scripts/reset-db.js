import fs from 'node:fs';
import path from 'node:path';
const p=path.resolve('data/streamatlas.db');
for(const s of ['', '-wal','-shm']){try{fs.unlinkSync(p+s)}catch{}}
console.log('Database deleted. The next npm start will regenerate sample catalog data.');
