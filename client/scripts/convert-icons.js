import sharp from 'sharp';
import fs from 'fs';

async function convert() {
  await sharp('./public/pwa-192x192.svg')
    .png()
    .toFile('./public/pwa-192x192.png');
    
  await sharp('./public/pwa-512x512.svg')
    .png()
    .toFile('./public/pwa-512x512.png');
    
  console.log('Successfully generated PNG icons!');
}

convert().catch(console.error);
