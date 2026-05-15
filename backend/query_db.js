const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:\Users\rmathis\source\pushups\backend\data\pushups.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

// Query recent pushups
db.all('SELECT id, count, timestamp, created_at FROM pushups ORDER BY id DESC LIMIT 3', (err, rows) => {
  if (err) {
    console.error('Error querying database:', err.message);
    db.close();
    process.exit(1);
  }
  
  console.log('Recent Entries (last 3):');
  rows.forEach(row => {
    console.log(  ID: \, Count: \, Timestamp: \, Created: \);
  });
  
  // Verify DATE extraction works
  db.all('SELECT DATE(timestamp) as date, COUNT(*) as count FROM pushups GROUP BY DATE(timestamp) ORDER BY DATE(timestamp) DESC LIMIT 3', (err, rows) => {
    if (err) {
      console.error('Error with DATE query:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log('');
    console.log('Entries by Date (GROUP BY DATE):');
    rows.forEach(row => {
      console.log(  Date: \, Count: \);
    });
    
    db.close();
  });
});
