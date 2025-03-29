'use client';

import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { useCompletion } from '@ai-sdk/react';

export default function AskExpertForm() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);
  const [hasAskedQuestion, setHasAskedQuestion] = useState<boolean>(false);

  // Use the useChat hook from the ai package to handle streaming
  const { completion, input, setInput, handleInputChange, handleSubmit, isLoading } = useCompletion({
    api: '/api/ask-expert',
  });

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to match the content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  // Clear input field after receiving a response
  useEffect(() => {
    if (completion && !isLoading) {
      setInput('');
    }
  }, [completion, isLoading, setInput]);

  // Handle default question selection
  const handleDefaultQuestion = async (questionText: string) => {
    // Set the input value to the selected question
    setInput(questionText);
  };

  // Custom submit handler to track question history
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Only add to history if there's actual input
    if (input.trim()) {
      setQuestionHistory(prev => [...prev, input]);
      setHasAskedQuestion(true);
    }

    // Call the original submit handler
    handleSubmit(e);
  };

  return (
    <div>
      <form onSubmit={handleFormSubmit} suppressHydrationWarning>
        <div className="flex flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute top-0 left-0 pt-3 pl-3 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask our shoe expert about Altra shoes..."
              className="form-input pl-10 py-3 w-full min-h-[48px]"
              style={{
                resize: 'none',
                overflow: 'hidden',
                lineHeight: '1.5',
              }}
              rows={1}
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-1 shrink-0">
            <button 
              type="submit" 
              className="btn btn-primary py-2 px-3 sm:py-3 sm:px-6"
              disabled={isLoading}
            >
              →
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-neutral-500">
          By submitting a question, you agree that your question may be stored and used by third parties. 
          See our <a href="/legal/privacy-notice" className="text-primary-600 hover:underline">Privacy Notice</a> for details.
        </div>
      </form>

      {/* Conditionally show either common questions or question history */}
      <div className="mt-4">
        {!hasAskedQuestion ? (
          /* Common questions - shown before any question is asked */
          <>
            <p className="text-sm text-neutral-500 mb-2">Common questions:</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDefaultQuestion("What's the highest stack height zero drop shoe?")}
                className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
                disabled={isLoading}
              >
                What's the highest stack height zero drop shoe?
              </button>
              <button
                type="button"
                onClick={() => handleDefaultQuestion("What's the widest trail shoe available?")}
                className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
                disabled={isLoading}
              >
                What's the widest trail shoe available?
              </button>
              <button
                type="button"
                onClick={() => handleDefaultQuestion("Which shoes are best for flat feet runners?")}
                className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
                disabled={isLoading}
              >
                Which shoes are best for flat feet runners?
              </button>
              <button
                type="button"
                onClick={() => handleDefaultQuestion("What are the most cushioned shoes for long distance running?")}
                className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
                disabled={isLoading}
              >
                What are the most cushioned shoes for long distance running?
              </button>
              <button
                type="button"
                onClick={() => handleDefaultQuestion("Which shoes have the best grip for wet trail conditions?")}
                className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
                disabled={isLoading}
              >
                Which shoes have the best grip for wet trail conditions?
              </button>
            </div>
          </>
        ) : (
          /* Question history - shown after at least one question has been asked */
          <>
            <p className="text-sm text-neutral-500 mb-2">Question history:</p>
            <div className="flex flex-col gap-2">
              {questionHistory.map((question, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDefaultQuestion(question)}
                  className="text-sm text-left bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
                  disabled={isLoading}
                >
                  {question}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {completion && (
        <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="text-xs text-neutral-500 mb-2 italic">
            This response may contain affiliate links. We may earn a commission if you make a purchase through these links.
          </div>
          <div className="prose max-w-none">
            <ReactMarkdown>{completion}</ReactMarkdown>
          </div>
        </div>
      )}

      {isLoading && !completion && (
        <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
          <div className="animate-pulse">
            <p className="text-neutral-600">Our shoe expert is thinking...</p>
          </div>
        </div>
      )}
    </div>
  );
}
