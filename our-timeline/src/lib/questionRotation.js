import { randomInt } from "node:crypto";

// Random choice without replacement, per browser. Start a new round only after
// every question has been used, avoiding the last question at the round boundary.
export function chooseQuestion(questions, history = []) {
  const ids = new Set(questions.map(q => q.id));
  let seen = Array.isArray(history) ? history.filter(id => ids.has(id)) : [];
  let available = questions.filter(q => !seen.includes(q.id));
  if (!available.length) {
    const last = seen.at(-1);
    seen = [];
    available = questions.length > 1 ? questions.filter(q => q.id !== last) : questions;
  }
  const question = available[randomInt(available.length)];
  return { question, history: [...seen, question.id] };
}
