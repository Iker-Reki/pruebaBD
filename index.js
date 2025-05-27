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

//Inserta un usuario
app.post('/api/registro', (req, res) => {
  const { nombreUsu, ape1Usu, ape2Usu, correoUsu, contraUsu } = req.body;
  db.query(
    'INSERT INTO usuario (nombreUsu, ape1Usu, ape2Usu, correoUsu, contraUsu) VALUES (?, ?, ?, ?, ?)',
    [nombreUsu, ape1Usu, ape2Usu, correoUsu, contraUsu],
    (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al crear usuario' });
      }
      res.json({ success: true, message: 'Usuario registrado con éxito' });
    }
  );

});

//Cambio contraseña
app.post('/api/cambio-contra', (req, res) => {
    const { idUsu, contraUsu } = req.body;

    if (!idUsu || !contraUsu) {
        return res.status(400).json({ 
            success: false,
            message: 'Datos incompletos' 
        });
    }

    db.query(
        'UPDATE usuario SET contraUsu = ? WHERE idUsu = ?',
        [contraUsu, idUsu],
        (err, results) => {
            if (err) {
                console.error('Error al actualizar:', err);
                return res.status(500).json({ 
                    success: false,
                    message: 'Error en la base de datos' 
                });
            }
            
            if (results.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Usuario no encontrado' 
                });
            }

            res.json({ 
                success: true,
                message: 'Contraseña actualizada con éxito' 
            });
        }
    );
});
// Confederaciones
app.get('/api/confederaciones', (req, res) => {
    db.query('SELECT * FROM confederacion', (err, results) => {
        if (err) {
            res.status(500).json({ error: err });
        } else {
            res.json(results);
        }
    });
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor en puerto ${port}`);
});