const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => console.log('🟢 Conectado a PostgreSQL'))
  .catch(err => console.error('🔴 Error al conectar a PostgreSQL', err));

module.exports = client;
