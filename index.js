require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('Error al conectar a la BD:', err);
  } else {
    console.log('Base de datos conectada');
  }
});

app.get('/', (req, res) => {
  res.send('¡API funcionando desde Clever Cloud!');
});

app.get('/api/usuario', (req, res) => {
  db.query('SELECT * FROM usuario', (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
    } else {
      res.json(results);
    }
  });
});

//COmprobar si el usuario esta en la base de datos
app.post('/api/login', (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
  }

  const query = 'SELECT * FROM usuario WHERE correoUsu = ? AND contraUsu = ?';
  
  db.query(query, [correo, contrasena], (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = results[0];
    
    // Devuelve todos los datos del usuario (excepto la contraseña por seguridad)
    res.json({
      success: true,
      usuario: {
        id: usuario.idUsu,
        nombre: usuario.nombreUsu,
        apellido1: usuario.ape1Usu,
        apellido2: usuario.ape2Usu,
        correo: usuario.correoUsu
        
      }
    });
  });
});

//Comprueba si existe un correo ya en la bd y devuele un count con el numero de coincidencias
app.get('/api/check-correo', (req, res) => {
    const { email } = req.query; // Recibe el email como query parameter
    
    db.query(
        'SELECT COUNT(*) as count FROM usuario WHERE correoUsu = ?', 
        [email],
        (err, results) => {
            if (err) {
                console.error('Error en la consulta:', err);
                return res.status(500).json({ error: 'Error en la base de datos' });
            }
            res.json({ count: results[0].count });
        }
    );
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor en puerto ${port}`);
});