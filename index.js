const express = require('express');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Middleware para proteger rutas
const SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_segura';
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token faltante' });

  jwt.verify(token, SECRET, (err, usuario) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.usuario = usuario;
    next();
  });
}

// 🔄 RUTAS PRINCIPALES
const rutasUsuarios = require('./routes/usuarios');
const rutasProveedores = require('./routes/proveedores');
const rutasServicios = require('./routes/servicios');
const rutasFavoritos = require('./routes/favoritos');
const rutasCategorias = require('./routes/categorias');
const rutasLogin = require('./routes/login');
const rutasNotificaciones = require('./routes/notificaciones');

app.use('/usuarios', rutasUsuarios);
app.use('/proveedores', rutasProveedores);
app.use('/servicios', rutasServicios);
app.use('/favoritos', rutasFavoritos);
app.use('/categorias', rutasCategorias);
app.use('/', rutasLogin); // maneja /login y /registro
app.use(rutasNotificaciones);

// 🔧 Ruta de prueba
app.get('/ping', (req, res) => {
  res.json({ message: 'MarketFest backend activo' });
});

// ✅ Ruta protegida de prueba
app.get('/perfil', verificarToken, (req, res) => {
  res.json({ mensaje: 'Accediste correctamente al perfil 🟢', usuario: req.usuario });
});

// ▶️ Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
