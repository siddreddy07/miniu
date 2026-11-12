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

app.listen(port, (error) => {
  if (error) {
    console.log('Could not start the server on port ' + port + ':', error.message);
    console.log('Maybe an old server is still running on this port. Stop it and try again.');
    return;
  }
  console.log('Server running on http://localhost:' + port);
});
