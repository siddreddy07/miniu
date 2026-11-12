import 'dotenv/config';
import { app } from './app.js';
import { createTables } from './lib/db.js';

const port = process.env.PORT || 4000;

// Connect to the database and create the table on startup
try {
  await createTables();
  console.log('Database ready');
} catch (error) {
  console.log('Database not ready, memory will not work:', error.message);
}

app.listen(port, () => {
  console.log('Server running on http://localhost:' + port);
});
