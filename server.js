const express = require("express");
const cors = require("cors"); // Import CORS
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors()); // Aktifkan CORS
app.use(express.json());

const PORT = 3000 || process.env.PORT;

const SUPABASE_URL = "https://ijcoypjmaepwdeagjwnv.supabase.co";
const SUPABASE_SERVICE_ROLE =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqY295cGptYWVwd2RlYWdqd252Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDM1NTY1NywiZXhwIjoyMDQ5OTMxNjU3fQ.FZBv1r8fNCdhcMdWXura7rkAQB3_WLl_W_Fx3sz6VBQ";

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Middleware untuk validasi sesi login
const requireAuth = async (req, res, next) => {
    const sessionToken = req.headers.authorization?.split(" ")[1]; // Ambil token dari header Authorization

    if (!sessionToken) {
        return res.status(401).json({ error: "Unauthorized access, please log in." });
    }

    try {
        const { data, error } = await db.auth.getSession(sessionToken);

        if (error || !data.session) {
            return res.status(401).json({ error: "Invalid or expired session token." });
        }

        req.user = data.session.user; // Tambahkan user ke req
        next(); // Lanjutkan ke endpoint berikutnya
    } catch (err) {
        console.error("Error validating session:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
};

// Endpoint untuk mendapatkan semua data film
app.get("/home", async (req, res) => {
    try {
        console.log("Fetching data from Supabase...");
        const { data, error } = await db.from("reviews").select();

        if (error) {
            console.error("Supabase error:", error);
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Endpoint untuk menambah data film
app.post("/", async (req, res) => {
    try {
        const { title, content, genre, rating, image, actor } = req.body;

        if (!title || !content || !genre || !rating || !image || !actor) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const { data, error } = await db.from("reviews").insert([
            { title, content, genre, rating, image, actor },
        ]);

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint untuk mendapatkan detail film berdasarkan ID
app.get("/film/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID parameter." });
        }

        const { data, error } = await db.from("reviews").select().eq("id", id).single();

        if (error) {
            if (error.code === "PGRST116") {
                return res.status(404).json({ error: "Film not found." });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error("Error fetching film:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Endpoint untuk login user menggunakan Supabase Authentication
app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        const { data, error } = await db.auth.signInWithPassword({ email, password });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ success: true, user: data.user, session: data.session });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint untuk logout user
app.post("/auth/logout", async (req, res) => {
    try {
        const { error } = await db.auth.signOut();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint untuk dashboard dengan validasi login
app.get("/dashboard", requireAuth, (req, res) => {
    res.json({ success: true, message: "Welcome to the Dashboard!", user: req.user });
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
