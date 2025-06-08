//############## CONSTANTES ###############

//API
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
/*
//WEBSOCKET
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

const clientes = new Set();

wss.on('connection', (ws) => {
    console.log('📡 Cliente WebSocket conectado');
    clients.add(ws);

    ws.on('close', () => {
        clients.delete(ws);
        console.log('❌ Cliente WebSocket desconectado');
    });
});

//NODEMAILER
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});
*/
//BASE DE DATOS
const mysql = require('mysql2');

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

//####################### FUNCIONES #########################
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
// NUEVO ENDPOINT: Obtener todas las confederaciones
app.get('/api/confederaciones', (req, res) => {
    db.query('SELECT idConfe, nombreConfe, ubicacionConfe FROM confederacion', (err, results) => {
        if (err) {
            console.error('Error al obtener confederaciones:', err);
            res.status(500).json({ error: 'Error del servidor al obtener confederaciones' });
        } else {
            res.json(results);
        }
    });
});

// NUEVO ENDPOINT: Obtener confederaciones favoritas de un usuario
app.get('/api/confederaciones/favoritas', (req, res) => {
    const { idUsu } = req.query; // Recibe el idUsu como query parameter
    if (!idUsu) {
        return res.status(400).json({ error: 'idUsu es requerido' });
    }
    const query = `
        SELECT c.idConfe, c.nombreConfe, c.ubicacionConfe
        FROM confederacion c
                 JOIN confe_usu cu ON c.idConfe = cu.idConfe
        WHERE cu.idUsu = ?;
    `;
    db.query(query, [idUsu], (err, results) => {
        if (err) {
            console.error('Error al obtener confederaciones favoritas:', err);
            res.status(500).json({ error: 'Error del servidor al obtener confederaciones favoritas' });
        } else {
            res.json(results);
        }
    });
});

// NUEVO ENDPOINT: Añadir una confederación a favoritos
app.post('/api/confederaciones/favoritas', (req, res) => {
    const { idUsu, idConfe } = req.body;
    if (!idUsu || !idConfe) {
        return res.status(400).json({ success: false, message: 'idUsu y idConfe son requeridos' });
    }

    const query = 'INSERT INTO confe_usu (idUsu, idConfe) VALUES (?, ?)';
    db.query(query, [idUsu, idConfe], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') { // Manejar duplicados si ya es favorito
                return res.status(409).json({ success: false, message: 'La confederación ya es favorita para este usuario' });
            }
            console.error('Error al añadir a favoritos:', err);
            return res.status(500).json({ success: false, message: 'Error del servidor al añadir a favoritos' });
        }
        res.json({ success: true, message: 'Confederación añadida a favoritos con éxito' });
    });
});

// NUEVO ENDPOINT: Eliminar una confederación de favoritos
app.delete('/api/confederaciones/favoritas', (req, res) => {
    const { idUsu, idConfe } = req.query; // Recibe como query parameters para DELETE
    if (!idUsu || !idConfe) {
        return res.status(400).json({ success: false, message: 'idUsu y idConfe son requeridos' });
    }

    const query = 'DELETE FROM confe_usu WHERE idUsu = ? AND idConfe = ?';
    db.query(query, [idUsu, idConfe], (err, results) => {
        if (err) {
            console.error('Error al eliminar de favoritos:', err);
            return res.status(500).json({ success: false, message: 'Error del servidor al eliminar de favoritos' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Confederación no encontrada en favoritos para este usuario' });
        }
        res.json({ success: true, message: 'Confederación eliminada de favoritos con éxito' });
    });
});

// NUEVO ENDPOINT: Obtener detalles de una confederación por ID
app.get('/api/confederacion/:idConfe', (req, res) => {
    const { idConfe } = req.params;
    const query = 'SELECT idConfe, nombreConfe, ubicacionConfe, capacidadConfe, fecConstConfe, alturaConfe FROM confederacion WHERE idConfe = ?';
    db.query(query, [idConfe], (err, results) => {
        if (err) {
            console.error('Error al obtener detalles de la confederación:', err);
            return res.status(500).json({ error: 'Error del servidor al obtener detalles de la confederación' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Confederación no encontrada' });
        }
        res.json(results[0]);
    });
});

// NUEVO ENDPOINT: Obtener datos de nivel de agua para una confederación por fecha
app.get('/api/datos_confederacion/:confeId', (req, res) => {
    const { confeId } = req.params;
    const { date } = req.query; // Expects date in 'YYYY-MM-DD' format

    if (!date) {
        return res.status(400).json({ error: 'La fecha (date) es requerida como query parameter.' });
    }

    const query = `
        SELECT d.nivelDato, d.fecDato, d.hora_dato
        FROM dato d
        JOIN dato_confe dc ON d.idDato = dc.datoId
        WHERE dc.confeId = ? AND d.fecDato = ?
        ORDER BY d.hora_dato ASC;
    `;
    db.query(query, [confeId, date], (err, results) => {
        if (err) {
            console.error('Error al obtener datos de nivel de agua:', err);
            return res.status(500).json({ error: 'Error del servidor al obtener datos de nivel de agua' });
        }
        res.json(results);
    });
});


// NUEVO ENDPOINT: Obtener todas las confederaciones
app.get('/api/confederaciones', (req, res) => {
    db.query('SELECT idConfe, nombreConfe, ubicacionConfe FROM confederacion', (err, results) => {
        if (err) {
            console.error('Error al obtener confederaciones:', err);
            res.status(500).json({ error: 'Error del servidor al obtener confederaciones' });
        } else {
            res.json(results);
        }
    });
});

// NUEVO ENDPOINT: Obtener confederaciones favoritas de un usuario
app.get('/api/confederaciones/favoritas', (req, res) => {
    const { idUsu } = req.query; // Recibe el idUsu como query parameter
    if (!idUsu) {
        return res.status(400).json({ error: 'idUsu es requerido' });
    }
    const query = `
        SELECT c.idConfe, c.nombreConfe, c.ubicacionConfe
        FROM confederacion c
                 JOIN confe_usu cu ON c.idConfe = cu.idConfe
        WHERE cu.idUsu = ?;
    `;
    db.query(query, [idUsu], (err, results) => {
        if (err) {
            console.error('Error al obtener confederaciones favoritas:', err);
            res.status(500).json({ error: 'Error del servidor al obtener confederaciones favoritas' });
        } else {
            res.json(results);
        }
    });
});

// NUEVO ENDPOINT: Añadir una confederación a favoritos
app.post('/api/confederaciones/favoritas', (req, res) => {
    const { idUsu, idConfe } = req.body;
    if (!idUsu || !idConfe) {
        return res.status(400).json({ success: false, message: 'idUsu y idConfe son requeridos' });
    }

    const query = 'INSERT INTO confe_usu (idUsu, idConfe) VALUES (?, ?)';
    db.query(query, [idUsu, idConfe], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') { // Manejar duplicados si ya es favorito
                return res.status(409).json({ success: false, message: 'La confederación ya es favorita para este usuario' });
            }
            console.error('Error al añadir a favoritos:', err);
            return res.status(500).json({ success: false, message: 'Error del servidor al añadir a favoritos' });
        }
        res.json({ success: true, message: 'Confederación añadida a favoritos con éxito' });
    });
});

// NUEVO ENDPOINT: Eliminar una confederación de favoritos
app.delete('/api/confederaciones/favoritas', (req, res) => {
    const { idUsu, idConfe } = req.query; // Recibe como query parameters para DELETE
    if (!idUsu || !idConfe) {
        return res.status(400).json({ success: false, message: 'idUsu y idConfe son requeridos' });
    }

    const query = 'DELETE FROM confe_usu WHERE idUsu = ? AND idConfe = ?';
    db.query(query, [idUsu, idConfe], (err, results) => {
        if (err) {
            console.error('Error al eliminar de favoritos:', err);
            return res.status(500).json({ success: false, message: 'Error del servidor al eliminar de favoritos' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Confederación no encontrada en favoritos para este usuario' });
        }
        res.json({ success: true, message: 'Confederación eliminada de favoritos con éxito' });
    });
});

// NUEVO ENDPOINT: Obtener detalles de una confederación por ID
app.get('/api/confederacion/:idConfe', (req, res) => {
    const { idConfe } = req.params;
    const query = 'SELECT idConfe, nombreConfe, ubicacionConfe, capacidadConfe, fecConstConfe, alturaConfe FROM confederacion WHERE idConfe = ?';
    db.query(query, [idConfe], (err, results) => {
        if (err) {
            console.error('Error al obtener detalles de la confederación:', err);
            return res.status(500).json({ error: 'Error del servidor al obtener detalles de la confederación' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Confederación no encontrada' });
        }
        res.json(results[0]);
    });
});

// NUEVO ENDPOINT: Obtener datos de nivel de agua para una confederación por fecha
app.get('/api/datos_confederacion/:confeId', (req, res) => {
    const { confeId } = req.params;
    const { date } = req.query; // Expects date in 'YYYY-MM-DD' format

    if (!date) {
        return res.status(400).json({ error: 'La fecha (date) es requerida como query parameter.' });
    }

    const query = `
        SELECT d.nivelDato, d.fecDato, d.hora_dato
        FROM dato d
        JOIN dato_confe dc ON d.idDato = dc.datoId
        WHERE dc.confeId = ? AND d.fecDato = ?
        ORDER BY d.hora_dato ASC;
    `;
    db.query(query, [confeId, date], (err, results) => {
        if (err) {
            console.error('Error al obtener datos de nivel de agua:', err);
            return res.status(500).json({ error: 'Error del servidor al obtener datos de nivel de agua' });
        }
        res.json(results);
    });
});

//Recibir datos desde ESP32
app.post('/api/datos', (req, res) => {
    const { nivelDato } = req.body;
    const { confeId } = 4;

    if (nivelDato === undefined) {
        return res.status(400).json({ success: false, message: 'Falta nivelDato en el cuerpo de la petición' });
    }

    const fecha = new Date();
    const fecDato = fecha.toISOString().split('T')[0]; // YYYY-MM-DD
    const hora_dato = fecha.toTimeString().split(' ')[0]; // HH:MM:SS

    //Insertamos el nivel en la base de datos
    const query = 'INSERT INTO dato (nivelDato, fecDato, hora_dato) VALUES (?, ?, ?)';
    db.query(query, [nivelDato, fecDato, hora_dato], (err, results) => {
        if (err) {
            console.error('❌ Error al insertar dato:', err);
            return res.status(500).json({ success: false, message: 'Error en base de datos' });
        }

        const nivelId = results.insertId;

        //Asociar el id del nivel que acabamos de insertar a confederación
        const relQuery = 'INSERT INTO dato_confe (datoId, confeId) VALUES (?, ?)';
        db.query(relQuery, [nivelId, confeId], (err) => {
            if (err) {
                console.error('❌ Error al vincular dato con confederación:', err);
            }
        });
        
/*
        if (nivelDato > 0) {

            const correoQuery = `
                SELECT u.correoUsu
                FROM usuario u
                JOIN confe_usu cu ON u.idUsu = cu.idUsu
                WHERE cu.idConfe = ?`;
            db.query(correoQuery, [confeId], (err, usuarios) => {
                if (err) {
                    console.error('❌ Error al obtener correos:', err);
                    return;
                }

                usuarios.forEach(({ correoUsu }) => {
                    const mailOptions = {
                        from: process.env.MAIL_USER,
                        to: correoUsu,
                        suubject: `Alerta de nivel de agua en ${usuario.nombreConfe}`,
                        text: `Hola ${usuario.nombreUsu},\n\nEl nivel de agua en ${usuario.nombreConfe} ha alcanzado ${nivelActual}, superando el nivel de seguridad.\n\nPor favor, tome las medidas necesarias.\n\nSaludos,\nEquipo de Monitoreo`,
                        html: `<p>Hola ${usuario.nombreUsu},</p>
                 <p>El nivel de agua en <strong>${usuario.nombreConfe}</strong> ha alcanzado <strong>${nivelActual}</strong>, superando el nivel de seguridad.</p>
                 <p>Por favor, tome las medidas necesarias.</p>
                 <p>Saludos,<br>Equipo de Monitoreo</p>`
                    };

                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) {
                            console.error(`❌ Error al enviar correo a ${correoUsu}:`, err);
                        } else {
                            console.log(`✉️ Correo enviado a ${correoUsu}: ${info.response}`);
                        }
                    });
                });
            });

        }
            
        //Verificar si el nivel enviado por arduino supera el nivel de alerta
        const UMBRAL = parseInt(process.env.UMBRAL_NIVEL) || 200;

        if (nivelDato > UMBRAL) {
            const correoQuery = `
                SELECT u.correoUsu
                FROM usuario u
                JOIN confe_usu cu ON u.idUsu = cu.idUsu
                WHERE cu.idConfe = ?`;
            db.query(correoQuery, [confeId], (err, usuarios) => {
                if (err) {
                    console.error('❌ Error al obtener correos:', err);
                    return;
                }

                usuarios.forEach(({ correoUsu }) => {
                    const mailOptions = {
                        from: process.env.MAIL_USER,
                        to: correoUsu,
                        suubject: `Alerta de nivel de agua en ${usuario.nombreConfe}`,
                        text: `Hola ${usuario.nombreUsu},\n\nEl nivel de agua en ${usuario.nombreConfe} ha alcanzado ${nivelActual}, superando el nivel de seguridad.\n\nPor favor, tome las medidas necesarias.\n\nSaludos,\nEquipo de Monitoreo`,
                        html: `<p>Hola ${usuario.nombreUsu},</p>
                 <p>El nivel de agua en <strong>${usuario.nombreConfe}</strong> ha alcanzado <strong>${nivelActual}</strong>, superando el nivel de seguridad.</p>
                 <p>Por favor, tome las medidas necesarias.</p>
                 <p>Saludos,<br>Equipo de Monitoreo</p>`
                    };

                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) {
                            console.error(`❌ Error al enviar correo a ${correoUsu}:`, err);
                        } else {
                            console.log(`✉️ Correo enviado a ${correoUsu}: ${info.response}`);
                        }
                    });
                });
            });
        }
*/
        res.json({
            success: true,
            message: 'Dato guardado correctamente',
            insertId: results.insertId
        });
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor en puerto ${port}`);
});
/*
function enviarNotificacionSocket(mensaje) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(mensaje));
        }
    }
}
    */