const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET = 'tu_clave_secreta_segura';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = result.rows[0];

    if (!usuario.email_verificado) {
      return res.status(403).json({ error: 'Tu cuenta no está verificada' });
    }

const coincide = await bcrypt.compare(password, usuario.contraseña_hash);


    if (!coincide) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ id: usuario.id, email: usuario.email }, SECRET, {
      expiresIn: '1h'
    });

    // ✅ Añadido es_proveedor a la respuesta
res.json({
  token,
  nombre: usuario.nombre,
  es_proveedor: usuario.es_proveedor,
  id: usuario.id
});

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
