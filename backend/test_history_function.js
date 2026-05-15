const { initializeDatabase } = require('./src/db/init');
const model = require('./src/db/model');

async function test() {
  try {
    const db = await initializeDatabase('./data/pushups.db');
    const history = await model.getHistory(db, 30);
    console.log('History data:', JSON.stringify(history, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
