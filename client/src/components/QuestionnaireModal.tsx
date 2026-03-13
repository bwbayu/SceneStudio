import { useState } from 'react';
import { XIcon, MagicIcon } from './Icons';

interface Question {
    question: string;
    options: string[];
    multi_select: boolean;
}

interface QuestionnaireModalProps {
    isOpen: boolean;
    onClose: () => void;
    questions: Question[];
    onGenerate: (answers: Record<number, { selected: string[]; otherInput: string }>) => void;
}

export default function QuestionnaireModal({ isOpen, onClose, questions, onGenerate }: QuestionnaireModalProps) {
    const [activeTab, setActiveTab] = useState(0);
    const [answers, setAnswers] = useState<Record<number, { selected: string[], otherInput: string }>>(
        () => Object.fromEntries(questions.map((_, idx) => [idx, { selected: [], otherInput: '' }]))
    );

    if (!isOpen) return null;

    const handleOptionToggle = (questionIdx: number, option: string, isMulti: boolean) => {
        setAnswers(prev => {
            const current = prev[questionIdx] || { selected: [], otherInput: '' };
            let newSelected;

            if (isMulti) {
                if (current.selected.includes(option)) {
                    newSelected = current.selected.filter(o => o !== option);
                } else {
                    newSelected = [...current.selected, option];
                }
            } else {
                newSelected = [option];
            }

            return {
                ...prev,
                [questionIdx]: { ...current, selected: newSelected }
            };
        });
    };

    const currentQuestion = questions[activeTab];
    const currentAnswer = answers[activeTab] || { selected: [], otherInput: '' };

    return (
        <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-md animate-[fade-in]"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="glass relative w-full max-w-2xl animate-[scale-in] overflow-hidden rounded-3xl border border-border-default bg-bg-card shadow-2xl">

                {/* Header with Tabs */}
                <div className="border-b border-white/5 bg-white/5 px-8 pt-8 pb-4">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-(--color-accent-primary)/10 p-2 border border-(--color-accent-primary)/20">
                                <MagicIcon className="h-4 w-4 text-(--color-accent-primary)" />
                            </div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider" style={{ fontFamily: "'Sora', sans-serif" }}>
                                Story Questionnaire
                            </h2>
                        </div>
                        <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-text-muted hover:bg-white/10 transition-all">
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Q Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
                        {questions.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveTab(idx)}
                                className={`shrink-0 rounded-full px-5 py-2 text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${activeTab === idx
                                        ? 'bg-(--color-accent-primary) text-black shadow-lg shadow-(--color-accent-primary)/20 scale-105'
                                        : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                                    }`}
                                style={{ fontFamily: "'Sora', sans-serif" }}
                            >
                                Q{idx + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Question Body */}
                <div className="min-h-100 p-8">
                    <div key={activeTab} className="animate-[fade-in-up]">
                        <h3 className="mb-8 text-xl font-bold leading-tight text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
                            {currentQuestion.question}
                        </h3>

                        <div className="space-y-3">
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = currentAnswer.selected.includes(option);
                                return (
                                    <label
                                        key={idx}
                                        className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.01] ${isSelected
                                                ? 'border-(--color-accent-primary) bg-(--color-accent-primary)/5 shadow-lg shadow-(--color-accent-primary)/5'
                                                : 'border-white/5 bg-white/2 hover:bg-white/5'
                                            }`}
                                    >
                                        <input
                                            type={currentQuestion.multi_select ? "checkbox" : "radio"}
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() => handleOptionToggle(activeTab, option, currentQuestion.multi_select)}
                                        />
                                        {/* Custom Radio/Checkbox */}
                                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-300 ${isSelected ? 'border-(--color-accent-primary) bg-(--color-accent-primary)' : 'border-white/10'
                                            }`}>
                                            {isSelected && (
                                                <div className={currentQuestion.multi_select ? "text-black" : "h-2 w-2 rounded-full bg-black"} >
                                                    {currentQuestion.multi_select && (
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-sm font-medium transition-colors ${isSelected ? 'text-white' : 'text-text-secondary'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                                            {option}
                                        </span>
                                    </label>
                                )
                            })}

                            {/* Other Option */}
                            <div className="space-y-4 pt-4">
                                <label
                                    className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-5 transition-all duration-300 ${currentAnswer.selected.includes('Other')
                                            ? 'border-accent-rose bg-accent-rose/5'
                                            : 'border-white/5 bg-white/2 hover:bg-white/5'
                                        }`}
                                >
                                    <input
                                        type={currentQuestion.multi_select ? "checkbox" : "radio"}
                                        className="hidden"
                                        checked={currentAnswer.selected.includes('Other')}
                                        onChange={() => handleOptionToggle(activeTab, 'Other', currentQuestion.multi_select)}
                                    />
                                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-300 ${currentAnswer.selected.includes('Other') ? 'border-accent-rose bg-accent-rose' : 'border-white/10'
                                        }`}>
                                        {currentAnswer.selected.includes('Other') && (
                                            <div className={currentQuestion.multi_select ? "text-black" : "h-2 w-2 rounded-full bg-black"} >
                                                {currentQuestion.multi_select ? (
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-sm font-medium ${currentAnswer.selected.includes('Other') ? 'text-white' : 'text-text-secondary'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                                        Other (Write your own...)
                                    </span>
                                </label>

                                {currentAnswer.selected.includes('Other') && (
                                    <div className="animate-[fade-in] px-2">
                                        <textarea
                                            value={currentAnswer.otherInput}
                                            onChange={(e) => setAnswers(prev => ({
                                                ...prev,
                                                [activeTab]: { ...prev[activeTab], otherInput: e.target.value }
                                            }))}
                                            placeholder="Type your manual details here..."
                                            className="w-full rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white outline-none focus:border-accent-rose/50 transition-all min-h-25"
                                            style={{ fontFamily: "'Outfit', sans-serif" }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between border-t border-white/5 bg-white/5 p-8">
                    <div className="flex gap-2">
                        <button
                            disabled={activeTab === 0}
                            onClick={() => setActiveTab(prev => Math.max(0, prev - 1))}
                            className="rounded-xl bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/10 disabled:opacity-20"
                        >
                            Back
                        </button>
                        {activeTab < questions.length - 1 ? (
                            <button
                                onClick={() => setActiveTab(prev => Math.min(questions.length - 1, prev + 1))}
                                className="rounded-xl bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/10"
                            >
                                Next Q
                            </button>
                        ) : null}
                    </div>

                    <button
                        onClick={() => onGenerate(answers)}
                        className="group relative flex items-center gap-3 overflow-hidden rounded-xl bg-linear-to-r from-(--color-accent-primary) to-(--color-accent-secondary) px-10 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-black shadow-xl shadow-(--color-accent-primary)/20 transition-all hover:scale-[1.05] active:scale-[0.95]"
                    >
                        Generate Story
                        <MagicIcon className="h-4 w-4" />
                    </button>
                </div>

                {/* Decorative elements */}
                <div className="absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-(--color-accent-primary) opacity-[0.03] blur-[100px]" />
                <div className="absolute -bottom-20 -left-20 -z-10 h-64 w-64 rounded-full bg-accent-rose opacity-[0.03] blur-[100px]" />
            </div>
        </div>
    );
}
