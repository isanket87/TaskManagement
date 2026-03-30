const fs = require('fs');
const path = '/var/www/brioright/server/scripts/backup.sh';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/DB_NAME=".*"/, 'DB_NAME="brioright"');
content = content.replace(/DB_USER=".*"/, 'DB_USER="brioright"');

fs.writeFileSync(path, content);
console.log('Backup script updated successfully');
