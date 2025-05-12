require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key_change_me";
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { exec } = require("child_process");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());

// Try to start Ollama if it's not already running
exec("ollama serve", (error, stdout, stderr) => {
  if (error) {
    // If Ollama is already running, this will error, but that's OK
    if (!stderr.includes("Only one usage of each socket address")) {
      console.error(`Error starting Ollama: ${error.message}`);
    }
  } else {
    console.log("Ollama started.");
  }
});

// In-memory user storage: { username: { passwordHash, stats: [] } }
const users = {};

// Registration endpoint
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  if (users[username]) {
    return res.status(409).json({ error: "Username already exists" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  users[username] = { passwordHash, stats: [] };
  res.json({ success: true });
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// Auth middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.post("/api/ai", async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "phi",
      prompt,
      stream: false,
    });
    res.json({ response: response.data.response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/generate-lesson", async (req, res) => {
  console.log("Received request for lesson generation:", req.body);
  const { weaknesses = [], difficulty = "easy" } = req.body;

  // Create a more specific prompt
  let prompt = `Act as a typing tutor. Create exactly 12 simple English sentences for typing practice.
Rules:
1. Each sentence MUST be a complete, standalone sentence
2. Each sentence MUST start with a capital letter and end with a period
3. Use only common English words
4. Keep sentences short (5-15 words each)
5. Put each sentence on a new line
6. Use simple punctuation (periods and commas only)
7. No numbers or special characters
8. No quotation marks or dialogue`;

  if (weaknesses.length > 0) {
    prompt += `\n9. Include words with these letters: ${weaknesses.join(", ")}`;
  }

  if (difficulty === "easy") {
    prompt += "\n10. Use very simple, short words";
  } else if (difficulty === "medium") {
    prompt += "\n10. Use moderate length words";
  } else {
    prompt += "\n10. Use longer, more complex words";
  }

  prompt +=
    "\n\nRespond ONLY with the 12 sentences, one per line. No other text.";

  try {
    console.log("Sending request to Ollama...");
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "phi",
      prompt,
      stream: false,
    });

    console.log("Raw response from Ollama:", response.data);

    if (!response.data.response) {
      throw new Error("No response from Ollama");
    }

    // Enhanced text cleaning and validation
    const lines = response.data.response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    console.log("Initial lines:", lines);

    const cleanedLines = lines
      .map((line) => {
        // Remove leading number and dot (e.g., '1. ')
        line = line.replace(/^\d+\.\s*/, "");
        // Remove leading/trailing quotes
        line = line.replace(/^['"]|['"]$/g, "");

        // Remove extra spaces
        line = line.trim().replace(/\s+/g, " ");

        // Ensure first letter is capital
        line = line.charAt(0).toUpperCase() + line.slice(1);

        // Ensure ends with period
        if (!line.endsWith(".")) {
          line = line + ".";
        }

        // Fix spacing around commas
        line = line.replace(/\s*,\s*/g, ", ");

        return line;
      })
      .filter((line) => {
        // Validate each sentence
        return (
          line.length >= 10 && // Minimum length
          line.length <= 150 && // Maximum length
          /^[A-Z].*\.$/.test(line) && // Starts with capital, ends with period
          !/["""''']/.test(line) && // No quotes
          !/[0-9]/.test(line) && // No numbers
          !/[;:!?]/.test(line) && // No complex punctuation (but allow commas)
          !/\s{2,}/.test(line) // No double spaces
        );
      });

    console.log("Cleaned lines:", cleanedLines);

    if (cleanedLines.length < 5) {
      // If we don't have enough sentences, add some default ones
      const defaultSentences = [
        "The quick brown fox jumps over the lazy dog.",
        "She walks to the park every morning.",
        "The sun shines brightly in the blue sky.",
        "My friend enjoys reading books in the garden.",
        "The cat sleeps peacefully on the windowsill.",
        "Birds sing beautiful songs in the trees.",
        "He practices typing to improve his skills.",
        "The flowers bloom in the spring garden.",
        "Children play happily in the playground.",
        "The wind blows gently through the leaves.",
        "Time flies when you are having fun.",
        "Good things come to those who wait.",
      ];

      while (cleanedLines.length < 12) {
        cleanedLines.push(defaultSentences[cleanedLines.length]);
      }
    }

    // Take exactly 12 sentences
    const finalSentences = cleanedLines.slice(0, 12);
    const cleanedLesson = finalSentences.join("\n");

    console.log("Sending cleaned lesson:", cleanedLesson);
    res.json({ lesson: cleanedLesson });
  } catch (err) {
    console.error("Error in /api/generate-lesson:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Please ensure Ollama is running and the phi model is installed.",
    });
  }
});

// Save completed lesson stats (per user)
app.post("/api/stats", requireAuth, (req, res) => {
  const { wpm, accuracy, errors, lessonLength } = req.body;
  if (
    typeof wpm !== "number" ||
    typeof accuracy !== "number" ||
    typeof errors !== "number" ||
    typeof lessonLength !== "number"
  ) {
    return res.status(400).json({ error: "Invalid stats data" });
  }
  const username = req.user.username;
  if (!users[username]) {
    return res.status(401).json({ error: "User not found" });
  }
  const entry = {
    date: new Date().toISOString(),
    wpm,
    accuracy,
    errors,
    lessonLength,
  };
  users[username].stats.push(entry);
  res.json({ success: true });
});

// Get all completed lesson stats for logged-in user
app.get("/api/stats", requireAuth, (req, res) => {
  const username = req.user.username;
  if (!users[username]) {
    return res.status(401).json({ error: "User not found" });
  }
  res.json({ stats: users[username].stats });
});

app.listen(3001, () => console.log("AI backend running on port 3001"));
