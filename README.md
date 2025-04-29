# AI Typing Assistant

An interactive typing practice application that uses AI to generate personalized typing lessons, adapts to your weaknesses, and provides real-time feedback on typing accuracy and speed.

## Features

- **AI-generated typing lessons tailored to user weaknesses**: The AI analyzes your typing performance and generates new exercises that focus on the keys, characters, or patterns you struggle with most, helping you improve efficiently.
- **Adaptive practice loop**: As you type, the app continuously tracks your errors and speed, updating its understanding of your weaknesses and adapting future lessons accordingly.
- **Real-time feedback and visual cues**: The virtual keyboard highlights the next key to press, including both base and shifted characters (e.g., !, @, ", etc.), and visually indicates errors and correct/incorrect characters as you type.
- **Performance metrics**: Track your accuracy, current WPM (words per minute), best WPM, and error count live as you practice.
- **Automatic theme switching**: The app adapts its color scheme (light/dark mode) based on the time of day or your system's theme.
- **Responsive design**: Works well on various screen sizes.

## Project Structure

The project is divided into two main parts:

### Frontend (React)

The frontend is built with React and provides the user interface for the typing assistant. It includes:

- Typing prompt display with word wrapping and visual feedback
- Virtual keyboard that highlights both base and shifted keys for the next character
- Real-time stats and error tracking
- Adaptive UI for light/dark mode

### Backend (Node.js)

The backend serves the API endpoints that generate personalized typing lessons using AI. It includes:

- API for generating typing lessons based on user weaknesses and difficulty preferences
- Integration with AI models to create natural language typing content
- Logic to adapt lesson content as the user's weaknesses change

## Setup and Installation

### Prerequisites

- Node.js (v14.x or later)
- npm or yarn

### Installation Steps

1. Clone the repository:

   ```
   git clone <repository-url>
   cd ai-typing-assistant
   ```

2. Install backend dependencies:

   ```
   cd backend
   npm install
   ```

3. Install frontend dependencies:

   ```
   cd ../frontend
   npm install
   ```

4. Start the backend server:

   ```
   cd ../backend
   npm start
   ```

5. Start the frontend development server:

   ```
   cd ../frontend
   npm start
   ```

6. Open your browser and navigate to `http://localhost:3000`

## Usage

- Begin typing when a lesson appears
- Follow the highlighted keys on the virtual keyboard (including Shift + key for symbols)
- Review your live performance statistics (accuracy, current WPM, best WPM, errors)
- A new, personalized lesson will automatically load after each completed session

## Technologies Used

- React.js
- Node.js
- Express
- CSS3
- HTML5
- AI text generation (OpenAI or similar)

## License

[Insert your chosen license here]

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- SunCalc for daylight calculation
- Sound effects for keyboard interaction
