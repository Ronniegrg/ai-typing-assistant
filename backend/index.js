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
  console.log("[BACKEND] Received request for lesson generation:", req.body);
  const { weaknesses = [], difficulty = "easy" } = req.body;

  // Create a more open-ended prompt
  let prompt = `Write a story or passage in English for typing practice. The topic can be anything, including science, art, history, technology, or any other field. Each sentence must start with a capital letter and end with a period, exclamation mark, or question mark. Use proper punctuation. Put each sentence on a new line. Dialogue is allowed. Numbers and special characters are allowed. Do NOT use any ordered lists or bullet points. Respond ONLY with the story, one sentence per line. No other text.`;

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
    "\n\nRespond ONLY with the story, one sentence per line. No other text.";

  console.log("[BACKEND] Prompt sent to Ollama:", prompt);

  try {
    console.log("[BACKEND] Sending request to Ollama...");
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "phi",
      prompt,
      stream: false,
    });

    console.log("[BACKEND] Raw response from Ollama:", response.data);

    if (!response.data.response) {
      throw new Error("No response from Ollama");
    }

    // Improved sentence splitting regex
    const sentences =
      response.data.response.match(/[^.!?]+[.!?]["']?(?=\s|$)/g) || [];
    const lines = sentences
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    console.log("[BACKEND] Initial lines:", lines);

    const cleanedLines = lines
      .map((line) => {
        // Remove leading number, bullet, or dot (e.g., '1. ', '- ', '* ', etc.)
        line = line.replace(/^\s*([\d]+[.)]|[-*•])\s*/, "");
        // Remove leading/trailing quotes (but keep dialogue quotes inside the sentence)
        line = line.replace(/^['"]|['"]$/g, "");
        // Remove extra spaces
        line = line.trim().replace(/\s+/g, " ");
        // Ensure first letter is capital
        line = line.charAt(0).toUpperCase() + line.slice(1);
        // Ensure ends with period
        if (!/[.!?]$/.test(line)) {
          line = line + ".";
        }
        // Fix spacing around commas
        line = line.replace(/\s*,\s*/g, ", ");
        return line;
      })
      .filter((line) => {
        // Validate each sentence (no list, but allow numbers, special chars, dialogue)
        return (
          line.length >= 10 && // Minimum length
          line.length <= 200 && // Maximum length
          /^[A-Z].*[.!?]$/.test(line) && // Starts with capital, ends with period
          !/\s{2,}/.test(line) // No double spaces
        );
      });

    console.log("[BACKEND] Cleaned lines:", cleanedLines);

    // Return the full story as the lesson (no slicing, no fallback)
    const cleanedLesson = cleanedLines.join("\n");

    console.log("[BACKEND] Sending cleaned lesson:", cleanedLesson);
    res.json({ lesson: cleanedLesson });
  } catch (err) {
    console.error("[BACKEND] Error in /api/generate-lesson:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Please ensure Ollama is running and the phi model is installed.",
    });
  }
});

app.listen(3001, () => console.log("AI backend running on port 3001"));
