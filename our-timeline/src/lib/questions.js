// Security questions for the gate.
// Real questions and correct answers are loaded from the SECURITY_QUESTIONS environment variable
// (a JSON string) so sensitive answers are never committed to version control.

export const FALLBACK_QUESTIONS = [
  {
    id: 1,
    question: "What was the first movie we watched together?",
    answers: ["Superman"],
  },
  {
    id: 2,
    question: "What was the first place we went to in Laguna together called?",
    answers: ["Top of the world"],
  },
  {
    id: 3,
    question: "What was the first album you ever made me listen to?",
    answers: ["Folklore"],
  },
  {
    id: 4,
    question: "What was the game I got on as a kid just to talk to you?",
    answers: ["Animal jam"],
  },
  {
    id: 5,
    question: "What was the first thing you ever privately texted me?",
    answers: ["Hey lol"],
  },
  {
    id: 6,
    question: "What is the name of the monkey you gave me?",
    answers: ["Sebastian"],
  },
  {
    id: 7,
    question: "What ice cream flavor did we get on the Seal Beach date?",
    answers: ["Root beer"],
  },
];

// Returns the full list of questions (including answers) from process.env, or fallback
export function getQuestions() {
  if (process.env.SECURITY_QUESTIONS) {
    try {
      const parsed = JSON.parse(process.env.SECURITY_QUESTIONS);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.error("Failed to parse SECURITY_QUESTIONS environment variable:", err);
    }
  }
  return FALLBACK_QUESTIONS;
}

// For backwards compatibility and convenience
export const QUESTIONS = FALLBACK_QUESTIONS;

export function getQuestionById(id) {
  const questions = getQuestions();
  return questions.find((q) => q.id === id) || null;
}

// Case-insensitive, trimmed answer validation
export function verifyAnswer(questionId, answer) {
  if (!answer || typeof answer !== "string") return false;
  const question = getQuestionById(questionId);
  if (!question || !Array.isArray(question.answers)) return false;

  const normalizedInput = answer.trim().toLowerCase();
  return question.answers.some(
    (correct) => typeof correct === "string" && correct.trim().toLowerCase() === normalizedInput
  );
}
