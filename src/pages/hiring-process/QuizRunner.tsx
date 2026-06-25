import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, X, ClipboardList, Award, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { quizPassMark, type Quiz } from "./quizzes.data";

export type QuizResult = {
    quizId: string;
    score: number;
    total: number;
    passed: boolean;
    answers: Record<string, number>;
    at: number;
};

/**
 * QuizRunner — an exam-style multiple-choice quiz shown ONE QUESTION AT A TIME with
 * Previous / Next navigation and an optional question image. Powers the driver
 * taking the quiz, the read-only "Review" of a submitted result, and the builder
 * preview.
 *
 *  mode "take"    → driver answers and submits; onSubmit gets the scored result.
 *  mode "review"  → read-only; shows the driver's answers vs the answer key + score.
 *  mode "preview" → admin preview; answer freely, reveal the key, nothing is saved.
 */
export function QuizRunner({ quiz, mode, initialAnswers, driverName, embedded, onClose, onSubmit }: {
    quiz: Quiz;
    mode: "take" | "review" | "preview";
    initialAnswers?: Record<string, number>;
    driverName?: string;
    embedded?: boolean;
    onClose: () => void;
    onSubmit?: (result: QuizResult) => void;
}) {
    const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers ?? {});
    const [submitted, setSubmitted] = useState(mode === "review");
    const [current, setCurrent] = useState(0);
    const final = submitted || mode === "review";         // the whole quiz is finished (score banner shown)

    const total = quiz.questions.length;
    const qq = quiz.questions[current];
    const answeredCount = quiz.questions.filter((x) => answers[x.id] !== undefined).length;
    const score = useMemo(() => quiz.questions.reduce((n, x) => n + (answers[x.id] === x.answer ? 1 : 0), 0), [quiz, answers]);
    const passMark = quizPassMark(quiz);
    const passed = score >= passMark;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const isLast = current === total - 1;

    const chosen = answers[qq.id];
    // Reveal the correct answer for THIS question as soon as it's been selected (and lock it).
    const qReveal = final || chosen !== undefined;

    const pick = (idx: number) => { if (qReveal) return; setAnswers((s) => ({ ...s, [qq.id]: idx })); };
    const go = (d: number) => setCurrent((c) => Math.min(total - 1, Math.max(0, c + d)));
    const submit = () => {
        setSubmitted(true);
        setCurrent(0);
        if (mode === "take") onSubmit?.({ quizId: quiz.id, score, total, passed, answers, at: Date.now() });
    };

    return (
        <div className={cn(embedded ? "relative" : "min-h-screen bg-slate-50")}>
            {/* App bar */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Back</button>
                    <div className="ml-1 min-w-0">
                        <h1 className="flex items-center gap-2 truncate text-sm font-bold text-slate-900">
                            <ClipboardList className="h-4 w-4 shrink-0 text-blue-500" /> {quiz.title}
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">{quiz.category}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{mode === "take" ? "Quiz" : mode === "review" ? "Review" : "Preview"}</span>
                        </h1>
                        <p className="truncate text-xs text-slate-500">{total} questions · pass mark {passMark}/{total} ({quiz.passPct}%){driverName ? ` · ${driverName}` : ""}</p>
                    </div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">Question {current + 1} / {total}</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full bg-slate-100">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((current + 1) / total) * 100}%` }} />
            </div>

            <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
                {/* Score banner (after submit / in review) */}
                {final && (
                    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4", passed ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60")}>
                        <div className="flex items-center gap-3">
                            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white", passed ? "bg-emerald-500" : "bg-rose-500")}>{passed ? <Award className="h-5 w-5" /> : <X className="h-5 w-5" />}</span>
                            <div>
                                <p className={cn("text-sm font-bold", passed ? "text-emerald-800" : "text-rose-800")}>{passed ? "Passed" : "Did not pass"}</p>
                                <p className="text-xs text-slate-600">Score <span className="font-bold tabular-nums">{score}/{total}</span> · {pct}% · pass mark {quiz.passPct}%</p>
                            </div>
                        </div>
                        {mode === "preview" && submitted && <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setAnswers({}); setSubmitted(false); setCurrent(0); }}><RotateCcw className="h-4 w-4" /> Reset preview</Button>}
                    </div>
                )}

                {/* The single current question */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <p className="mb-4 flex gap-2.5 text-base font-semibold text-slate-900">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[12px] font-bold text-white">{current + 1}</span>
                        <span className="pt-0.5">{qq.prompt}</span>
                    </p>

                    {qq.image && (
                        <div className="mb-4 flex justify-center">
                            <img src={qq.image} alt="Question" className="h-40 w-40 rounded-xl border border-slate-200 bg-white object-contain p-2 shadow-sm" />
                        </div>
                    )}

                    <div className="space-y-2.5">
                        {qq.options.map((opt, oi) => {
                            const isChosen = chosen === oi;
                            const isCorrect = qq.answer === oi;
                            const showCorrect = qReveal && isCorrect;
                            const showWrong = qReveal && isChosen && !isCorrect;
                            return (
                                <button key={oi} type="button" disabled={qReveal} onClick={() => pick(oi)}
                                    className={cn("flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14px] transition-colors",
                                        showCorrect ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                                            : showWrong ? "border-rose-400 bg-rose-50 text-rose-800"
                                                : isChosen ? "border-blue-500 bg-blue-50/70 text-blue-800 ring-1 ring-blue-500/20"
                                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>
                                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold",
                                        showCorrect ? "border-emerald-500 bg-emerald-500 text-white"
                                            : showWrong ? "border-rose-500 bg-rose-500 text-white"
                                                : isChosen ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-400")}>
                                        {showCorrect ? <Check className="h-3.5 w-3.5" /> : showWrong ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + oi)}
                                    </span>
                                    <span className="flex-1">{opt}</span>
                                </button>
                            );
                        })}
                    </div>
                    {qReveal && (
                        <div className={cn("mt-3.5 flex items-start gap-2 rounded-xl border px-4 py-3 text-[13px] leading-relaxed",
                            chosen === qq.answer ? "border-emerald-200 bg-emerald-50/70 text-emerald-800" : "border-rose-200 bg-rose-50/70 text-rose-800")}>
                            {chosen === qq.answer ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
                            <span>
                                <span className="font-semibold">{chosen === qq.answer ? "Correct. " : `Incorrect — the correct answer is ${String.fromCharCode(65 + qq.answer)}. `}</span>
                                {qq.explanation ?? (chosen !== qq.answer ? qq.options[qq.answer] : "")}
                            </span>
                        </div>
                    )}
                    {final && chosen === undefined && <p className="mt-3 text-xs font-medium text-amber-600">Not answered</p>}
                </div>

                {/* Footer navigation */}
                <div className="flex items-center justify-between gap-3">
                    <Button variant="outline" disabled={current === 0} onClick={() => go(-1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>

                    {!final && (
                        <span className="text-xs text-slate-500">{answeredCount}/{total} answered</span>
                    )}

                    {final ? (
                        isLast
                            ? <Button onClick={onClose}>Done</Button>
                            : <Button onClick={() => go(1)}>Next <ChevronRight className="h-4 w-4" /></Button>
                    ) : isLast ? (
                        <Button onClick={submit} disabled={answeredCount === 0}>{mode === "take" ? "Finish & submit" : "Finish"}</Button>
                    ) : (
                        <Button onClick={() => go(1)}>Next <ChevronRight className="h-4 w-4" /></Button>
                    )}
                </div>

                {/* Question dots — quick jump */}
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                    {quiz.questions.map((x, i) => {
                        const ans = answers[x.id] !== undefined;
                        const isCur = i === current;
                        const correct = ans && answers[x.id] === x.answer;
                        const wrong = ans && answers[x.id] !== x.answer;
                        return (
                            <button key={x.id} type="button" onClick={() => setCurrent(i)} title={`Question ${i + 1}`}
                                className={cn("h-6 w-6 rounded-md text-[11px] font-bold transition-colors",
                                    isCur ? "bg-slate-800 text-white"
                                        : correct ? "bg-emerald-100 text-emerald-700"
                                            : wrong ? "bg-rose-100 text-rose-700"
                                                : ans ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}>
                                {i + 1}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
