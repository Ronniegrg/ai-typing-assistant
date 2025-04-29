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
  let prompt = "Generate a typing practice lesson with these requirements:\n";
  prompt += "1. Exactly 12 complete, simple sentences\n";
  prompt += "2. Each sentence must be grammatically correct\n";
  prompt += "3. Use only standard English words with proper spacing\n";
  prompt += "4. No hyphenation or word breaks\n";
  prompt += "5. One sentence per line\n";
  prompt += "6. No extra spaces between words or at line ends\n";
  if (weaknesses.length > 0) {
    prompt += `7. Include practice for these skills: ${weaknesses.join(
      ", "
    )}\n`;
  }
  prompt += "\nProvide ONLY the sentences, with no numbering or extra text.";

  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "phi",
      prompt,
      stream: false,
    });

    // Enhanced text cleaning
    const cleanedLesson = response.data.response
      .split("\n")
      .map((line) => {
        // Remove extra spaces, including those at the beginning and end
        line = line.trim().replace(/\s+/g, " ");
        // Ensure no spaces before punctuation
        line = line.replace(/\s+([.,!?])/g, "$1");
        // Ensure proper spacing after punctuation
        line = line.replace(/([.,!?])(\w)/g, "$1 $2");
        return line;
      })
      .filter((line) => {
        // Remove empty lines and lines that don't form complete sentences
        return (
          line.length > 0 &&
          /^[A-Z].*[.!?]$/.test(line) && // Must start with capital letter and end with punctuation
          !/\s{2,}/.test(line)
        ); // No double spaces
      })
      .join("\n");

    res.json({ lesson: cleanedLesson });
  } catch (err) {
    console.error("Error in /api/generate-lesson:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("AI backend running on port 3001"));
