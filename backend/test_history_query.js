const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/pushups.db');

const query = `
  SELECT 
    date(timestamp) as date,
    COALESCE(SUM(count), 0) as total
  FROM pushups
  WHERE datetime(timestamp) >= datetime('now', '-30 days')
  GROUP BY date(timestamp)
  ORDER BY date(timestamp) ASC
`;

db.all(query, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Rows:', JSON.stringify(rows, null, 2));
  }
  db.close();
});
