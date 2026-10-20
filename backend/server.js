
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Database = require("better-sqlite3");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to SQLite database
const db = new Database("campus.db");

// Create the clubs table if it does not exist
db.exec(`
    CREATE TABLE IF NOT EXISTS clubs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        meeting_day TEXT,
        contact_email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Check that a club exists
function getClub(id) {
    return db.prepare("SELECT * FROM clubs WHERE id = ?").get(id);
}

// Home route
app.get("/", (req, res) => {
    res.json({
        message: "ICT251 Campus Club API is running!"
    });
});

// GET: Retrieve all clubs
app.get("/api/clubs", (req, res) => {
    try {
        const clubs = db.prepare(
            "SELECT * FROM clubs ORDER BY id DESC"
        ).all();

        res.json(clubs);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve clubs." });
    }
});

// GET: Retrieve one club by ID
app.get("/api/clubs/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid club ID." });
    }

    try {
        const club = getClub(id);

        if (!club) {
            return res.status(404).json({ error: "Club not found." });
        }

        res.json(club);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve club." });
    }
});

// POST: Add a new club
app.post("/api/clubs", (req, res) => {
    const {
        name,
        category,
        description,
        meeting_day,
        contact_email
    } = req.body;

    if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof category !== "string" ||
        !category.trim()
    ) {
        return res.status(400).json({
            error: "Club name and category are required."
        });
    }

    try {
        const result = db.prepare(`
            INSERT INTO clubs
            (name, category, description, meeting_day, contact_email)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            name.trim(),
            category.trim(),
            typeof description === "string" ? description.trim() : null,
            typeof meeting_day === "string" ? meeting_day.trim() : null,
            typeof contact_email === "string" ? contact_email.trim() : null
        );

        const newClub = getClub(Number(result.lastInsertRowid));

        res.status(201).json(newClub);
    } catch (error) {
        res.status(500).json({ error: "Failed to create club." });
    }
});

// PUT: Update an existing club
app.put("/api/clubs/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid club ID." });
    }

    const {
        name,
        category,
        description,
        meeting_day,
        contact_email
    } = req.body;

    if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof category !== "string" ||
        !category.trim()
    ) {
        return res.status(400).json({
            error: "Club name and category are required."
        });
    }

    try {
        if (!getClub(id)) {
            return res.status(404).json({ error: "Club not found." });
        }

        db.prepare(`
            UPDATE clubs
            SET name = ?,
                category = ?,
                description = ?,
                meeting_day = ?,
                contact_email = ?
            WHERE id = ?
        `).run(
            name.trim(),
            category.trim(),
            typeof description === "string" ? description.trim() : null,
            typeof meeting_day === "string" ? meeting_day.trim() : null,
            typeof contact_email === "string" ? contact_email.trim() : null,
            id
        );

        res.json(getClub(id));
    } catch (error) {
        res.status(500).json({ error: "Failed to update club." });
    }
});

// DELETE: Remove a club
app.delete("/api/clubs/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid club ID." });
    }

    try {
        const club = getClub(id);

        if (!club) {
            return res.status(404).json({ error: "Club not found." });
        }

        db.prepare("DELETE FROM clubs WHERE id = ?").run(id);

        res.json({
            message: "Club deleted successfully.",
            deletedClub: club
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete club." });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
