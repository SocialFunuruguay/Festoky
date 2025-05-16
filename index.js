const express = require('express');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/ping', (req, res) => {
  res.json({ message: 'MarketFest backend activo' });
});

app.post('/usuarios', async (req, res) => {
  const { nombre, email } = req.body;

  if (!nombre || !email) {
    return res.status(400).json({ error: 'Faltan datos: nombre o email' });
  }

  try {
    const result = await db.query(
      'INSERT INTO usuarios (nombre, email) VALUES ($1, $2) RETURNING *',
      [nombre, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'No se pudo crear el usuario' });
  }
});

// ✅ Esta línea debe estar **solo una vez**
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
