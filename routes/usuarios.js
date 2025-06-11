const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// 🔹 Envío de correo
async function enviarCorreoVerificacion(destino, link) {
 const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'j.ramirezvieira@gmail.com',
    pass: 'jpdiisclicitodtq'
  },
  tls: {
    rejectUnauthorized: false // 👈 esta línea debe estar aquí adentro
  }
});


  const mailOptions = {
    from: 'Festario <tucorreo@gmail.com>',
    to: destino,
    subject: 'Verificá tu cuenta en Festario 🎉',
    html: `<p>Gracias por registrarte en <strong>Festario</strong>.</p>
           <p>Hacé clic en este enlace para verificar tu cuenta:</p>
           <a href="${link}">${link}</a>`
  };

  await transporter.sendMail(mailOptions);
}

// 🔸 Registro
const bcrypt = require('bcrypt');

// POST /registro
router.post('/registro', async (req, res) => {
  const { nombre, email, contraseña, confirmarContraseña } = req.body;

  if (!nombre || !email || !contraseña || !confirmarContraseña) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (contraseña !== confirmarContraseña) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden' });
  }

  try {
    // Verificar si el email ya está registrado
    const existe = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }

    // Hashear la contraseña
    const hash = await bcrypt.hash(contraseña, 10);

    // Crear token de verificación
    const token = jwt.sign({ email }, 'tu_clave_secreta_segura', { expiresIn: '1d' });

    // Insertar usuario en la base
    const nuevo = await db.query(
      `INSERT INTO usuarios (nombre, email, tipo_login, contraseña_hash, token_verificacion)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email`,
      [nombre, email, 'local', hash, token]
    );

    // Enlace para verificar la cuenta
    const linkVerificacion = `http://localhost:3000/usuarios/verificar/${token}`;
    await enviarCorreoVerificacion(email, linkVerificacion);

    res.status(201).json({
      mensaje: 'Cuenta creada. Verificá tu correo para activarla.',
      usuario: nuevo.rows[0]
    });

  } catch (error) {
    console.error('❌ Error en /registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
 
// 🔸 Verificar cuenta
router.get('/verificar/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, 'tu_clave_secreta_segura');
    const email = decoded.email;

    const result = await db.query(
      'SELECT * FROM usuarios WHERE email = $1 AND token_verificacion = $2',
      [email, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send('❌ Enlace inválido o ya utilizado.');
    }

    await db.query(
      `UPDATE usuarios
       SET email_verificado = true, token_verificacion = NULL
       WHERE email = $1`,
      [email]
    );

    res.send('✅ Cuenta verificada correctamente. Ya podés iniciar sesión.');
  } catch (err) {
    console.error('❌ Error al verificar email:', err);
    res.status(400).send('❌ El enlace es inválido o ha expirado.');
  }
});

// 🔸 Reenvío de verificación
router.post('/reenviar-verificacion', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Falta el correo electrónico' });
  }

  try {
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Correo no encontrado' });
    }

    const usuario = result.rows[0];

    if (usuario.email_verificado) {
      return res.status(400).json({ error: 'La cuenta ya está verificada' });
    }

    const token = jwt.sign({ email }, 'tu_clave_secreta_segura', { expiresIn: '1d' });

    await db.query(
      'UPDATE usuarios SET token_verificacion = $1 WHERE email = $2',
      [token, email]
    );

    const linkVerificacion = `http://localhost:3000/usuarios/verificar/${token}`;
    await enviarCorreoVerificacion(email, linkVerificacion);

    res.json({ mensaje: '📩 Correo de verificación reenviado' });
  } catch (error) {
    console.error('❌ Error al reenviar verificación:', error);
    res.status(500).json({ error: 'Error al reenviar correo' });
  }
});

// 🔸 Consultar usuarios (opcional)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    res.status(500).json({ error: 'No se pudieron obtener los usuarios' });
  }
});

module.exports = router;
