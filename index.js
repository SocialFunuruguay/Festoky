const db = require('./db');

const express = require('express');
const app = express();:app.use(express.json()); // permite leer JSON en las peticiones

const port = process.env.PORT || 3000;

app.get('/ping', (req, res) => {
  res.json({ message: 'MarketFest backend activo' });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
