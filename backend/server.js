// server.js

const express = require('express');
const cors = require('cors'); // Asegúrate de que 'cors' está instalado (npm install cors)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// --- Configuración Global de CORS (LA ÚNICA QUE NECESITAMOS) ---
// ¡¡ASEGÚRATE DE QUE ESTA URL ES LA CORRECTA PARA TU FRONTEND!!
const frontendOrigin = 'https://5173-idx-guild-manager-1743801121420.cluster-duylic2g3fbzerqpzxxbw6helm.cloudworkstations.dev';

const corsOptions = {
  origin: frontendOrigin, // Permitir solo este origen
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Asegurar que PUT está aquí
  allowedHeaders: ['Content-Type', 'Authorization'], // Cabeceras necesarias/permitidas
};

// Log para confirmar la configuración al iniciar
console.log('--- Backend Server Starting ---');
console.log('CORS Configuration to be used:', corsOptions);

// --- Middlewares ---
// 1. Aplicar CORS globalmente ANTES de cualquier ruta
app.use(cors(corsOptions));

// 2. Middleware para parsear JSON
app.use(express.json());


// --- Conexión a la Base de Datos SQLite ---
const dbPath = path.join(__dirname, 'guilds.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database.");
        // Crear tabla y añadir datos iniciales si no existen
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS guilds (
                guild_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                level INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error("Error creating table:", err.message);
                else console.log("Table 'guilds' checked/created.");
                // Datos de ejemplo (no se insertarán si ya existen por IGNORE)
                const insertSql = "INSERT OR IGNORE INTO guilds (name, level) VALUES (?, ?)";
                db.run(insertSql, ["Knights of Valor", 5]);
                db.run(insertSql, ["Mystic Weavers", 3]);
                db.run(insertSql, ["Iron Legion", 4]);
            });
        });
    }
});

// --- Rutas de la API ---

// Ruta Raíz
app.get('/', (req, res) => {
    console.log(`Received request on /`);
    res.send('Guild Management Backend (Node/Express) is running!');
});

// --- Rutas para /api/guilds ---

// Obtener Todos los Gremios
app.get('/api/guilds', (req, res) => {
    console.log(`Received GET request for /api/guilds`);
    const sql = "SELECT guild_id, name, level FROM guilds ORDER BY name";
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("GET /api/guilds - Error querying guilds:", err.message);
            res.status(500).json({ error: "Failed to retrieve guilds", details: err.message });
            return;
        }
        console.log(`GET /api/guilds - Returning ${rows.length} guilds.`);
        res.json(rows);
    });
});

// Crear Nuevo Gremio
app.post('/api/guilds', (req, res) => {
    console.log(`Received POST request for /api/guilds`);
    const { name, level } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
         return res.status(400).json({ error: "Guild name is required and must be a non-empty string." });
    }
    const guildLevel = (level !== undefined && !isNaN(level) && Number(level) >= 1) ? parseInt(level, 10) : 1; // Default a 1 si no es válido o no se da

    const sql = `INSERT INTO guilds (name, level) VALUES (?, ?)`;
    const params = [name.trim(), guildLevel];

    db.run(sql, params, function (err) {
        if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
                console.error("POST /api/guilds - Error creating guild (duplicate):", name);
                return res.status(409).json({ error: "Guild name already exists", details: err.message });
            }
            console.error("POST /api/guilds - Error inserting guild:", err.message);
            return res.status(500).json({ error: "Failed to create guild", details: err.message });
        }
        console.log(`POST /api/guilds - Created guild with ID: ${this.lastID}`);
        // Devolver el objeto completo recién creado
        res.status(201).json({
            guild_id: this.lastID,
            name: name.trim(), // Devolver nombre saneado
            level: guildLevel
        });
    });
});

// --- Rutas para /api/guilds/:id ---

// Actualizar Gremio por ID
app.put('/api/guilds/:id', (req, res) => {
    const { id } = req.params;
    console.log(`Received PUT request for /api/guilds/${id}`);
    const { name, level } = req.body;

    if (isNaN(id)) return res.status(400).json({ error: "Invalid Guild ID provided." });
    const guildId = parseInt(id, 10);

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: "Guild name is required and must be a non-empty string." });
    }
    const guildLevel = (level !== undefined && !isNaN(level)) ? parseInt(level, 10) : null;
    if (level !== undefined && (guildLevel === null || guildLevel < 1)) {
        return res.status(400).json({ error: "If provided, level must be a positive number."});
    }

    let sql, params;
    // Construir la consulta dinámicamente basada en si se proporcionó un nivel válido
    if (guildLevel !== null) {
        sql = `UPDATE guilds SET name = ?, level = ? WHERE guild_id = ?`;
        params = [name.trim(), guildLevel, guildId];
    } else {
        // Si no se proporcionó un nivel válido, actualizar solo el nombre
        sql = `UPDATE guilds SET name = ? WHERE guild_id = ?`;
        params = [name.trim(), guildId];
        console.log(`   PUT /api/guilds/${guildId} - Updating only name.`);
    }

    db.run(sql, params, function (err) {
        if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
                console.error(`   PUT /api/guilds/${guildId} - Error updating guild (duplicate name):`, name);
                return res.status(409).json({ error: "Guild name already exists", details: err.message });
            }
            console.error(`   PUT /api/guilds/${guildId} - Error updating database:`, err.message);
            return res.status(500).json({ error: "Failed to update guild", details: err.message });
        }
        if (this.changes === 0) {
            console.log(`   PUT /api/guilds/${guildId} - Guild not found.`);
            return res.status(404).json({ error: `Guild with ID ${guildId} not found.` });
        }
        console.log(`   PUT /api/guilds/${guildId} - Guild updated successfully in DB.`);
        // Devolver el gremio actualizado consultándolo de nuevo
        const selectSql = "SELECT guild_id, name, level FROM guilds WHERE guild_id = ?";
        db.get(selectSql, [guildId], (selectErr, row) => {
            if (selectErr) {
                console.error(`   PUT /api/guilds/${guildId} - Error fetching updated guild after update:`, selectErr.message);
                // A pesar del error de lectura, la actualización fue exitosa
                return res.status(200).json({ message: "Guild updated, but failed to retrieve updated data."});
            }
            console.log(`   PUT /api/guilds/${guildId} - Returning updated guild data.`);
            res.status(200).json(row); // Devolver el objeto gremio completo y actualizado
        });
    });
});

// Eliminar Gremio por ID
app.delete('/api/guilds/:id', (req, res) => {
    const { id } = req.params;
    console.log(`Received DELETE request for /api/guilds/${id}`);

    if (isNaN(id)) return res.status(400).json({ error: "Invalid Guild ID provided." });
    const guildId = parseInt(id, 10);

    const sql = `DELETE FROM guilds WHERE guild_id = ?`;

    db.run(sql, guildId, function (err) {
        if (err) {
            console.error(`   DELETE /api/guilds/${guildId} - Error deleting guild:`, err.message);
            return res.status(500).json({ error: "Failed to delete guild", details: err.message });
        }
        if (this.changes === 0) {
            console.log(`   DELETE /api/guilds/${guildId} - Guild not found.`);
            return res.status(404).json({ error: `Guild with ID ${guildId} not found.` });
        }
        console.log(`   DELETE /api/guilds/${guildId} - Guild deleted successfully.`);
        res.status(204).send(); // 204 No Content es apropiado para DELETE exitoso
    });
});


// --- Iniciar Servidor ---
app.listen(port, '0.0.0.0', () => {
    console.log(`Backend server listening on port ${port}`);
    console.log(`Accessible within IDX environment via its public URL.`);
});

// --- Manejo de Cierre Limpio ---
process.on('SIGINT', () => {
    console.log('\nSIGINT received. Closing database connection...');
    db.close((err) => {
        if (err) console.error('Error closing database:', err.message);
        else console.log('Database connection closed.');
        process.exit(0);
    });
});
