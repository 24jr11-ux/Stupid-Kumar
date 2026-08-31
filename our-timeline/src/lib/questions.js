// Security questions for the gate.
// Real questions and correct answers are loaded from the SECURITY_QUESTIONS environment variable
// (a JSON string) so sensitive answers are never committed to version control.

export const FALLBACK_QUESTIONS = [
  {
    id: 1,
    question: "Where did we first meet?",
    answers: ["The Coffee Shop", "Coffee Shop", "Cafe"],
  },
  {
    id: 2,
    question: "What is our favorite season?",
    answers: ["Fall", "Autumn"],
  },
  {
    id: 3,
    question: "What is our favorite cozy dinner?",
    answers: ["Pizza", "Pasta", "Ramen", "Tacos"],
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
