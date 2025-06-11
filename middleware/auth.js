// middleware/auth.js
const jwt = require('jsonwebtoken');

const SECRET = 'tu_clave_secreta_segura'; // Podés usar process.env.SECRET si preferís

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token faltante' });
  }

  jwt.verify(token, SECRET, (err, usuario) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.usuario = usuario;
    next();
  });
}

module.exports = { verificarToken };
