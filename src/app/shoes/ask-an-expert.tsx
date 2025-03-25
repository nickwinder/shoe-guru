'use client';

import { useState } from 'react';

export default function AskExpertForm({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query) return;

    setIsLoading(true);
    setResponse('');

    try {
      // Simulate a delay to mimic the API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stub response based on the query
      let expertResponse = "I'm a stubbed shoe expert response. This is a placeholder that doesn't make actual LLM or graph calls.";

      // Add some conditional responses for demo purposes
      if (query.toLowerCase().includes("highest stack height zero drop")) {
        expertResponse = "The Altra Olympus 5 is one of the highest stack height zero drop shoes available, with a 33mm stack height while maintaining a zero drop platform. Other options include the Altra Paradigm 6 and the Topo Athletic Ultraventure 3.";
      } else if (query.toLowerCase().includes("widest trail shoe")) {
        expertResponse = "The Altra Lone Peak 7 and Topo Athletic Ultraventure 3 are among the widest trail shoes available, both featuring a wide toe box. The New Balance Fresh Foam More Trail v2 also comes in wide and extra-wide options for trail runners.";
      } else if (query.toLowerCase().includes("flat feet")) {
        expertResponse = "For flat feet runners, shoes with good stability features are recommended. The Brooks Adrenaline GTS 22, ASICS Gel-Kayano 29, and New Balance Fresh Foam 860v13 provide excellent support for overpronation often associated with flat feet.";
      } else if (query.toLowerCase().includes("cushioned") || query.toLowerCase().includes("long distance")) {
        expertResponse = "The most cushioned shoes for long distance running include the HOKA Bondi 8 with its maximum cushioning, the New Balance Fresh Foam More v4, and the Brooks Glycerin 20. These shoes provide excellent impact absorption for high mileage.";
      } else if (query.toLowerCase().includes("grip") || query.toLowerCase().includes("wet trail")) {
        expertResponse = "For the best grip in wet trail conditions, look for shoes with aggressive lugs and sticky rubber compounds. The Salomon Speedcross 6, Inov-8 Mudclaw G 260, and La Sportiva Bushido II excel in muddy and wet conditions with their superior traction.";
      } else if (query.toLowerCase().includes("running")) {
        expertResponse = "Running shoes should provide good cushioning and support for your specific gait. They typically last 300-500 miles before needing replacement.";
      } else if (query.toLowerCase().includes("size")) {
        expertResponse = "For proper shoe sizing, measure your feet in the evening when they're at their largest. Leave about a thumb's width of space between your longest toe and the end of the shoe.";
      } else if (query.toLowerCase().includes("barefoot")) {
        expertResponse = "Barefoot or minimalist shoes have little to no cushioning and a zero drop from heel to toe. They're designed to mimic natural foot movement and strengthen foot muscles.";
      }

      setResponse(expertResponse);
    } catch (error) {
      console.error("Error asking the expert:", error);
      setResponse("Sorry, I couldn't get an answer at this time. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} suppressHydrationWarning>
        <div className="flex flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask our shoe expert any question..."
              className="form-input pl-10 py-3 w-full"
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-1 shrink-0">
            <button 
              type="submit" 
              className="btn btn-primary py-2 px-3 sm:py-3 sm:px-6"
              disabled={isLoading}
            >
              {isLoading ? 'Thinking...' : '→'}
            </button>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResponse('');
                }}
                className="btn btn-outline py-2 px-2 sm:py-3 sm:px-3"
                disabled={isLoading}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Default question buttons */}
      <div className="mt-4">
        <p className="text-sm text-neutral-500 mb-2">Common questions:</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setQuery("What's the highest stack height zero drop shoe?");
              setTimeout(() => handleSubmit(new Event('submit') as unknown as React.FormEvent), 0);
            }}
            className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
            disabled={isLoading}
          >
            What's the highest stack height zero drop shoe?
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("What's the widest trail shoe available?");
              setTimeout(() => handleSubmit(new Event('submit') as unknown as React.FormEvent), 0);
            }}
            className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
            disabled={isLoading}
          >
            What's the widest trail shoe available?
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("Which shoes are best for flat feet runners?");
              setTimeout(() => handleSubmit(new Event('submit') as unknown as React.FormEvent), 0);
            }}
            className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
            disabled={isLoading}
          >
            Which shoes are best for flat feet runners?
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("What are the most cushioned shoes for long distance running?");
              setTimeout(() => handleSubmit(new Event('submit') as unknown as React.FormEvent), 0);
            }}
            className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
            disabled={isLoading}
          >
            What are the most cushioned shoes for long distance running?
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("Which shoes have the best grip for wet trail conditions?");
              setTimeout(() => handleSubmit(new Event('submit') as unknown as React.FormEvent), 0);
            }}
            className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
            disabled={isLoading}
          >
            Which shoes have the best grip for wet trail conditions?
          </button>
        </div>
      </div>

      {response && (
        <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <h3 className="text-lg font-medium mb-2">Expert Response:</h3>
          <div className="prose max-w-none">
            {response}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
          <div className="animate-pulse">
            <p className="text-neutral-600">Our shoe expert is thinking...</p>
          </div>
        </div>
      )}
    </div>
  );
}
