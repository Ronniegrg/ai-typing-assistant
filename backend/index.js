const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { exec } = require("child_process");

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
  const { weaknesses = [], difficulty = "easy" } = req.body;
  let prompt = "Create a typing lesson";
  if (weaknesses.length > 0) {
    prompt += ` focusing on the following weaknesses: ${weaknesses.join(
      ", "
    )}.`;
  }
  prompt += ` The lesson should be exactly 12 simple sentences, each on a new line, and suitable for typing practice. Do not include explanations, lists, or extra instructions—just the sentences for typing.`;
  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "phi",
      prompt,
      stream: false,
    });
    res.json({ lesson: response.data.response });
  } catch (err) {
    console.error("Error in /api/generate-lesson:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("AI backend running on port 3001"));
