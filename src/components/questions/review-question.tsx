"use client";

import type { ClientQuestion, QuestionResponse } from "@/lib/questions/types";
import { QuestionRenderer, type Feedback } from "./question-renderer";

/** Read-only question with its feedback (used on result pages). */
export function ReviewQuestion({ question, response, feedback }: { question: ClientQuestion; response: QuestionResponse | null; feedback: Feedback | null }) {
  return <QuestionRenderer question={question} value={response} onChange={() => {}} disabled feedback={feedback} />;
}
