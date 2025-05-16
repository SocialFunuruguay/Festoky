const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/ping', (req, res) => {
  res.json({ message: 'MarketFest backend activo' });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
